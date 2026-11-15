import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata = { title: "Topluluk kuralları" };

export default function RulesPage() {
  return (
    <>
      <h1>Topluluk kuralları</h1>
      <p>Moxie&apos;de kombinler Türkiye&apos;de satılan ürünlerle kurulur; altında da onları gerçekten giymiş, farklı vücutlardaki insanların denemeleri yer alır. Herkesin kendini rahat hissetmesi için birkaç basit kuralımız var.</p>

      <h2>Denemelerde</h2>
      <ul>
        <li>Sadece <b>kendine ait ve kendinin bulunduğu</b> fotoğrafları yükle.</li>
        <li>Aldığın bedeni ve fit notlarını dürüstçe yaz. Notlarını biz düzenlemeyiz.</li>
        <li>Yeni hesapların denemeleri kısa bir incelemeden sonra yayına girer.</li>
      </ul>

      <h2>Yasak olanlar</h2>
      <ul>
        <li>Başkasına ait fotoğraflar; Pinterest, Instagram, TikTok gibi platformlardan alınmış görseller.</li>
        <li>Çıplaklık, müstehcen ya da cinsel içerik.</li>
        <li>18 yaşından küçük kişilerin fotoğrafları.</li>
        <li>Taciz, nefret söylemi, aşağılama ve vücut hakkında yargılayıcı ifadeler.</li>
        <li>Spam, reklam ya da yanıltıcı bilgi.</li>
      </ul>

      <h2>Vücutlar hakkında</h2>
      <p>Her vücut burada eşit derecede değerli. &quot;İdeal&quot; bir beden ya da kilo yok; amacımız sadece sana benzeyen insanları bulup doğru bedeni seçmene yardım etmek. Bu yüzden yorum alanı bilinçli olarak yok.</p>

      <h2>Şikayet, engelleme, moderasyon</h2>
      <p>Kurallara aykırı bir içerik gördüğünde bayrak simgesiyle bize bildir. Üç farklı kişiden şikayet alan içerik incelenene kadar otomatik gizlenir. İstemediğin bir hesabı profilindeki menüden engelleyebilirsin; engellediğin kişi içeriklerini göremez ve seni takip edemez.</p>

      <h2>Telif</h2>
      <p>Kombinler başka platformlardaki görsellerden ilham alabilir ama fotoğrafları ekibimiz ya da kullanıcılarımız kendisi çeker. Ürün görselleri, mağazaların izin verdiği görseller veya kendi çekimimizdir. Hakkınızın ihlal edildiğini düşünüyorsanız <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> adresine yazın; içeriği inceleyip gerekirse kaldırırız.</p>

      <h2>Linkler ve şeffaflık</h2>
      <p>Bazı &quot;Mağazada gör&quot; linklerinden komisyon alırız; bu linkler &quot;işbirliği linki&quot; olarak işaretlenir. Komisyon yüzünden ürün öne çıkarmayız.</p>
    </>
  );
}
