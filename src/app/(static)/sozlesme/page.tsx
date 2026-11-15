import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata = { title: "Kullanıcı sözleşmesi" };

// TASLAK: Yayından önce bir hukukçu tarafından gözden geçirilmeli.
export default function TermsPage() {
  return (
    <>
      <h1>Kullanıcı sözleşmesi</h1>
      <p className="rounded-xl bg-lilac p-3 text-sm text-royal-dark">Bu metin taslaktır ve yayına alınmadan önce hukuki olarak gözden geçirilecektir.</p>

      <h2>Hizmet</h2>
      <p>Moxie; Türkiye&apos;de satılan ürünlerden oluşan kombinleri, bu kombinleri deneyen kullanıcıların fotoğraflarını, ölçülerini ve aldıkları bedenleri bir araya getiren bir platformdur. Moxie bir mağaza değildir; ürünleri satıcı mağazalardan satın alırsın.</p>

      <h2>Hesap</h2>
      <ul>
        <li>Moxie&apos;yi kullanmak için 18 yaşından büyük olmalısın.</li>
        <li>Hesabının güvenliğinden sen sorumlusun.</li>
        <li>Hesabını ve tüm verilerini istediğin zaman Ayarlar&apos;dan silebilirsin.</li>
      </ul>

      <h2>Yüklediğin içerik</h2>
      <ul>
        <li>Yalnızca <b>kendisine ait olan ve kendisinin bulunduğu</b> fotoğrafları yüklersin. Başkasına ait veya başka platformlardan alınmış görselleri yüklemezsin.</li>
        <li>İçeriğinin sahibi sensin. Moxie&apos;ye, içeriğini platformda göstermek ve paylaşım linklerinde önizlemek için gerekli, devredilemez ve hesabını sildiğinde sona eren bir kullanım izni verirsin.</li>
        <li><Link className="underline" href="/kurallar">Topluluk kuralları</Link>na aykırı içerikler gizlenebilir veya kaldırılabilir; tekrarlayan ihlallerde hesap askıya alınabilir.</li>
      </ul>

      <h2>Linkler ve fiyatlar</h2>
      <p>Ürün bilgileri ve fiyatlar bilgilendirme amaçlıdır; güncel fiyat ve stok mağazada geçerlidir. Bazı linklerden komisyon alırız; bu linkler işaretlenir ve ürün sıralamasını etkilemez.</p>

      <h2>Kişisel veriler</h2>
      <p>Kişisel verilerinin nasıl işlendiği <Link className="underline" href="/kvkk">KVKK aydınlatma metni</Link>nde açıklanır.</p>

      <h2>İletişim ve telif talepleri</h2>
      <p><a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </>
  );
}
