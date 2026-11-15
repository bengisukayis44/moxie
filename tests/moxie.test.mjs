// Moxie veritabanı kuralları testi. Gerçek Supabase projesine karşı çalışır;
// geçici kullanıcılar ve içerik oluşturur, iş bitince siler.
//   npm test
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
assert.ok(URL && ANON && SECRET, ".env.local içindeki Supabase değişkenleri gerekli");

const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
const anon = () => createClient(URL, ANON, { auth: { persistSession: false } });
const run = Date.now().toString(36);
const year = new Date().getFullYear() - 25;

// Gizli değerler benzersiz ondalıklar: yanıtta geçip geçmediği kesin anlaşılır
const SECRET_VALUES = { height_cm: 171.3, weight_kg: 63.7, waist_cm: 69.1, hip_cm: 97.3 };
const RANGE_VALUES = { bust_cm: 88.4 }; // aralık olarak dönmeli: 85–90

const users = {};
const ids = {};

async function makeUser(key, { role = "user", measurements, visibility = {} } = {}) {
  const email = `test-${key}-${run}@example.com`;
  const password = `Pw-${run}-${key}!`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { birth_year: String(year), kvkk: "true" },
  });
  if (error) throw error;
  const id = data.user.id;
  const username = `t_${key}_${run}`.slice(0, 30);
  await admin.from("profiles").update({ username, display_name: `Test ${key}`, role }).eq("id", id);
  const client = anon();
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  if (measurements) {
    await client.rpc("set_measurement_consent", { p_consent: true });
    const { error: e3 } = await client.from("body_measurements").upsert({ user_id: id, ...measurements, visibility });
    if (e3) throw e3;
  }
  users[key] = { id, client, username };
  return users[key];
}

async function upload(user, bucket) {
  const path = `${user.id}/t-${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await user.client.storage.from(bucket).upload(path, new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

async function tryon(user, lookId, size = "38", extra = {}) {
  const { data: look } = await user.client.rpc("get_look", { p_id: lookId });
  const photo = await upload(user, "tryon-photos");
  const { data, error } = await user.client.rpc("save_tryon", {
    p_look: lookId,
    p_note: "",
    p_photos: [{ path: photo, pose: "front" }],
    p_items: look.items.map((it, i) => (i === 0
      ? { look_item_id: it.look_item_id, worn: "same", size_bought: size, fit_rating: "true", ...extra }
      : { look_item_id: it.look_item_id, worn: "not_worn" })),
  });
  if (error) throw error;
  return data;
}

before(async () => {
  await makeUser("admin", { role: "admin" });
  await makeUser("creator", { role: "creator" });
  await makeUser("a", {
    measurements: { ...SECRET_VALUES, ...RANGE_VALUES, usual_top_size: "M" },
    visibility: { height_cm: "hidden", weight_kg: "hidden", waist_cm: "hidden", hip_cm: "hidden", bust_cm: "range" },
  });
  await makeUser("b", { measurements: { height_cm: 170, weight_kg: 62, waist_cm: 70, hip_cm: 96, bust_cm: 87 } });
  await makeUser("c");
  await makeUser("d");

  const cr = users.creator;
  const { data: p1, error } = await cr.client.rpc("save_product", { p_id: null, p: {
    brand: "zara", name: "Straight Fit Jean", category: "jean", store: "zara",
    url: "https://www.zara.com/tr/jean", price: 1299.95, attributes: { color: ["acik-mavi"], fabric: ["denim"] },
  } });
  if (error) throw error;
  const { data: p2 } = await cr.client.rpc("save_product", { p_id: null, p: {
    brand: "Mango", name: "Keten Gömlek", category: "gomlek", url: "https://shop.mango.com/tr/gomlek",
    attributes: { color: ["beyaz"], fabric: ["keten"] },
  } });
  ids.p1 = p1;
  ids.p2 = p2;
  const cover = await upload(cr, "look-photos");
  const { data: look, error: le } = await cr.client.rpc("save_look", {
    p_id: null, p_title: `Test kombin ${run}`, p_description: "Hafta sonu için rahat", p_style_tags: ["gunluk", "olmayan"],
    p_note: "Pinterest'ten ilham", p_photos: [cover], p_product_ids: [p1, p2], p_status: "published",
  });
  if (le) throw le;
  ids.look = look;
});

after(async () => {
  for (const u of Object.values(users)) {
    for (const bucket of ["tryon-photos", "look-photos", "avatars"]) {
      const { data } = await admin.storage.from(bucket).list(u.id);
      if (data?.length) await admin.storage.from(bucket).remove(data.map((f) => `${u.id}/${f.name}`));
    }
  }
  await admin.from("looks").delete().eq("id", ids.look);
  await admin.from("products").delete().in("id", [ids.p1, ids.p2].filter(Boolean));
  for (const u of Object.values(users)) await admin.auth.admin.deleteUser(u.id);
});

test("roller: normal kullanıcı kombin/ürün oluşturamaz, creator oluşturabilir, ilham notu gizli", async () => {
  const { error } = await users.c.client.rpc("save_product", { p_id: null, p: { brand: "x", name: "y" } });
  assert.ok(error, "normal kullanıcı ürün oluşturabildi");
  const { data: look } = await anon().rpc("get_look", { p_id: ids.look });
  assert.equal(look.title, `Test kombin ${run}`);
  assert.deepEqual(look.style_tags.map((s) => s.slug), ["gunluk"]);
  assert.equal(look.items.length, 2);
  assert.equal(look.items[0].brand, "Zara");
  assert.ok(!JSON.stringify(look).includes("Pinterest"), "ilham notu herkese görünüyor");
  const { data: notes } = await users.c.client.from("look_notes").select("*").eq("look_id", ids.look);
  assert.deepEqual(notes, []);
  const { data: own } = await users.creator.client.from("look_notes").select("*").eq("look_id", ids.look);
  assert.equal(own[0].inspiration_note, "Pinterest'ten ilham");
});

test("onay kuyruğu: yeni hesabın denemesi bekler, admin onaylayınca yayına girer ve bildirim gider", async () => {
  const res = await tryon(users.a, ids.look, "38");
  ids.tryonA = res.id;
  assert.equal(res.status, "pending");

  const { data: hidden } = await anon().rpc("get_tryon", { p_id: res.id });
  assert.equal(hidden, null, "onay bekleyen deneme herkese görünüyor");
  const { data: own } = await users.a.client.rpc("get_tryon", { p_id: res.id });
  assert.equal(own.status, "pending");

  const { data: queue } = await users.admin.client.rpc("admin_queue");
  assert.ok(queue.some((t) => t.id === res.id));
  const { error } = await users.admin.client.rpc("admin_review_tryon", { p_id: res.id, p_approve: true });
  assert.ifError(error);

  const { data: pub } = await anon().rpc("get_tryon", { p_id: res.id });
  assert.equal(pub.status, "published");
  assert.equal(pub.is_first, true, "ilk deneyen işaretlenmedi");

  const { data: na } = await users.a.client.rpc("list_notifications");
  assert.ok(na.some((n) => n.type === "tryon_approved"));
  const { data: nc } = await users.creator.client.rpc("list_notifications");
  assert.ok(nc.some((n) => n.type === "tryon_on_your_look"));

  const { data: look } = await anon().rpc("get_look", { p_id: ids.look });
  assert.equal(look.tryon_total, 1);
});

test("reddedilen denemenin sebebi sahibine bildirilir", async () => {
  const res = await tryon(users.d, ids.look, "40");
  await users.admin.client.rpc("admin_review_tryon", { p_id: res.id, p_approve: false, p_reason: "Fotoğraf net değil" });
  const { data } = await users.d.client.rpc("list_notifications");
  const n = data.find((x) => x.type === "tryon_rejected");
  assert.equal(n.data.reason, "Fotoğraf net değil");
});

test("gizli ve aralıklı ölçüler hiçbir API yanıtında ham dönmüyor", async () => {
  const assertNoRaw = (label, payload) => {
    const s = JSON.stringify(payload ?? null);
    for (const [k, v] of Object.entries({ ...SECRET_VALUES, ...RANGE_VALUES })) {
      assert.ok(!s.includes(String(v)), `${label}: ${k} ham değeri (${v}) yanıtta görünüyor`);
    }
  };
  for (const [who, client] of [["anonim", anon()], ["başka kullanıcı", users.b.client]]) {
    const responses = {
      feed_explore: await client.rpc("feed_explore"),
      feed_near: await client.rpc("feed_near"),
      feed_following: await client.rpc("feed_following"),
      get_look: await client.rpc("get_look", { p_id: ids.look }),
      get_tryon: await client.rpc("get_tryon", { p_id: ids.tryonA }),
      get_product: await client.rpc("get_product", { p_id: ids.p1 }),
      get_profile: await client.rpc("get_profile", { p_username: users.a.username }),
      profile_items: await client.rpc("profile_items", { p_username: users.a.username, p_kind: "tryons" }),
      search_looks: await client.rpc("search_looks", { p_q: "zara" }),
      body_measurements: await client.from("body_measurements").select("*").eq("user_id", users.a.id),
      tryon_measurements: await client.from("tryon_measurements").select("*"),
      profile_private: await client.from("profile_private").select("*").eq("user_id", users.a.id),
    };
    for (const [name, res] of Object.entries(responses)) assertNoRaw(`${who} / ${name}`, res.data);
    assert.deepEqual(responses.body_measurements.data ?? [], []);
    assert.deepEqual((responses.tryon_measurements.data ?? []).filter((r) => r.user_id === users.a.id), []);
    assert.deepEqual(responses.profile_private.data ?? [], []);
  }
  const { data } = await users.b.client.rpc("get_tryon", { p_id: ids.tryonA });
  assert.equal(data.measurements.height_cm, undefined);
  assert.deepEqual(data.measurements.bust_cm, { min: 85, max: 90 });
});

test("yakınlık: benzer vücut en üstte, Bana yakın akışında görünür; gizli ölçüyle filtrelenemez", async () => {
  const { data } = await users.b.client.rpc("get_tryon", { p_id: ids.tryonA });
  assert.ok(data.proximity >= 85, `beklenen ≥85, gelen ${data.proximity}`);
  const { data: near } = await users.b.client.rpc("feed_near");
  assert.ok(near.some((c) => c.id === ids.tryonA));
  const { data: look } = await users.b.client.rpc("get_look", { p_id: ids.look });
  assert.equal(look.tryons[0].id, ids.tryonA);
  const { data: filtered } = await anon().rpc("search_looks", { p_height_min: 171, p_height_max: 172 });
  assert.ok(!filtered.some((l) => l.id === ids.look), "gizli boy ile filtrelenebiliyor");
});

test("güven: 2 denemesi onaylanan kullanıcının sonraki denemesi doğrudan yayına girer", async () => {
  const cr = users.creator;
  const cover = await upload(cr, "look-photos");
  const { data: look2 } = await cr.client.rpc("save_look", {
    p_id: null, p_title: `İkinci ${run}`, p_description: "", p_style_tags: [], p_note: "",
    p_photos: [cover], p_product_ids: [ids.p2], p_status: "published",
  });
  ids.look2 = look2;
  const r = await tryon(users.a, look2, "M");
  await users.admin.client.rpc("admin_review_tryon", { p_id: r.id, p_approve: true });
  const { data: prof } = await admin.from("profiles").select("is_trusted").eq("id", users.a.id).single();
  assert.equal(prof.is_trusted, true);
  // Güvenilir kullanıcının denemesini düzenlemesi de doğrudan yayında kalır
  const again = await tryon(users.a, look2, "L");
  assert.equal(again.status, "published");
  await admin.from("looks").delete().eq("id", look2);
});

test("takip: Takip akışı takip edilenin içeriğini gösterir, bildirim gider", async () => {
  const { error } = await users.c.client.from("follows").insert({ follower_id: users.c.id, following_id: users.a.id });
  assert.ifError(error);
  const { data: feed } = await users.c.client.rpc("feed_following");
  assert.ok(feed.some((x) => x.kind === "tryon" && x.id === ids.tryonA));
  const { data: n } = await users.a.client.rpc("list_notifications");
  assert.ok(n.some((x) => x.type === "follow"));
  const { data: p } = await anon().rpc("get_profile", { p_username: users.a.username });
  assert.equal(p.follower_count, 1);
});

test("beğeni bildirimleri gruplanır", async () => {
  await users.b.client.from("tryon_likes").insert({ user_id: users.b.id, tryon_id: ids.tryonA });
  await users.c.client.from("tryon_likes").insert({ user_id: users.c.id, tryon_id: ids.tryonA });
  const { data } = await users.a.client.rpc("list_notifications");
  const likes = data.filter((x) => x.type === "like_tryon");
  assert.equal(likes.length, 1);
  assert.equal(likes[0].others, 1);
});

test("engelleme: engellenen kişi içeriği göremez, takip edemez, deneyemez; takipler silinir", async () => {
  // a, c'yi engeller (c, a'yı takip ediyordu)
  await users.a.client.from("blocks").insert({ blocker_id: users.a.id, blocked_id: users.c.id });
  const { data: follows } = await admin.from("follows").select("*").eq("follower_id", users.c.id).eq("following_id", users.a.id);
  assert.deepEqual(follows, []);
  const { data: t } = await users.c.client.rpc("get_tryon", { p_id: ids.tryonA });
  assert.equal(t, null, "engellenen kişi denemeyi görebiliyor");
  const { data: look } = await users.c.client.rpc("get_look", { p_id: ids.look });
  assert.ok(!look.tryons.some((x) => x.id === ids.tryonA));
  const { data: prof } = await users.c.client.rpc("get_profile", { p_username: users.a.username });
  assert.equal(prof.unavailable, true);
  const { error } = await users.c.client.from("follows").insert({ follower_id: users.c.id, following_id: users.a.id });
  assert.ok(error, "engellenen kişi takip edebildi");
  await users.a.client.from("blocks").delete().eq("blocked_id", users.c.id);
});

test("3 farklı şikayet alan deneme otomatik gizlenir ve admine düşer", async () => {
  for (const u of [users.b, users.c, users.d]) {
    const { error } = await u.client.from("reports").insert({ reporter_id: u.id, target_type: "tryon", target_id: ids.tryonA, reason: "test" });
    assert.ifError(error);
  }
  const { data } = await anon().rpc("get_tryon", { p_id: ids.tryonA });
  assert.equal(data, null, "3 şikayetten sonra hâlâ görünüyor");
  const { data: reports } = await users.admin.client.rpc("admin_reports");
  assert.ok(reports.some((r) => r.target_id === ids.tryonA && r.open_count === 3));
  await users.admin.client.rpc("admin_moderate", { p_type: "tryon", p_id: ids.tryonA, p_action: "restore" });
  const { data: back } = await anon().rpc("get_tryon", { p_id: ids.tryonA });
  assert.equal(back.status, "published");
});

test("Mağazada gör: tıklama kaydedilir; satışta olmayanın linki pasif", async () => {
  const { data: url } = await anon().rpc("track_click", { p_product: ids.p1, p_source_type: "look", p_source_id: ids.look });
  assert.equal(url, "https://www.zara.com/tr/jean");
  const { count } = await admin.from("link_clicks").select("*", { count: "exact", head: true }).eq("product_id", ids.p1);
  assert.equal(count, 1);
  await users.admin.client.rpc("admin_mark_product", { p_id: ids.p1, p_in_stock: false });
  const { data: none } = await anon().rpc("track_click", { p_product: ids.p1, p_source_type: "look", p_source_id: ids.look });
  assert.equal(none, null);
  await users.admin.client.rpc("admin_mark_product", { p_id: ids.p1, p_in_stock: true });
});

test("ürün sayfası: beden özeti ve denemeler", async () => {
  const { data } = await users.b.client.rpc("get_product", { p_id: ids.p1 });
  assert.equal(data.summary.count, 1);
  assert.equal(data.summary.top_size, "38");
  assert.equal(data.summary.fit.true, 1);
  assert.equal(data.tryons[0].id, ids.tryonA);
  assert.ok(data.looks.some((l) => l.id === ids.look));
});

test("arama: büyük/küçük harf, Türkçe karaktersiz, eş anlamlılar, özellikler", async () => {
  const find = async (params) => (await anon().rpc("search_looks", { p_limit: 50, ...params })).data.some((l) => l.id === ids.look);
  for (const q of ["zara", "ZARA", "kot", "jean", "gomlek", "keten", "hafta sonu", "gunluk", "mango"]) {
    assert.ok(await find({ p_q: q }), `"${q}" kombini bulmalı`);
  }
  assert.ok(!(await find({ p_q: "elbise" })));
  assert.ok(await find({ p_size: "38" }), "beden filtresi");
  assert.ok(await find({ p_style: "gunluk" }), "tarz filtresi");
  const { data: products } = await anon().rpc("search_products", { p_q: "kot" });
  assert.ok(products.some((p) => p.id === ids.p1));
});

test("hesap silinince creator'ın kombinleri arşivlenir, deneyenlere bildirilir", async () => {
  const cr = users.creator;
  const cover = await upload(cr, "look-photos");
  const { data: look3 } = await cr.client.rpc("save_look", {
    p_id: null, p_title: `Arşiv ${run}`, p_description: "", p_style_tags: [], p_note: "",
    p_photos: [cover], p_product_ids: [ids.p2], p_status: "published",
  });
  await tryon(users.b, look3, "S");
  // Uygulamadaki hesap silme gibi: önce fotoğraflar, sonra kullanıcı
  const { data: files } = await admin.storage.from("look-photos").list(cr.id);
  if (files?.length) await admin.storage.from("look-photos").remove(files.map((f) => `${cr.id}/${f.name}`));
  await admin.auth.admin.deleteUser(cr.id);
  delete users.creator;
  const { data: l } = await admin.from("looks").select("status, creator_id").eq("id", look3).single();
  assert.equal(l.status, "archived");
  assert.equal(l.creator_id, null);
  const { data: n } = await users.b.client.rpc("list_notifications");
  assert.ok(n.some((x) => x.type === "look_archived"));
  await admin.from("looks").delete().eq("id", look3);
});
