/**
 * NullVPN i18n — zero-dependency static language switcher
 * Supports: en, ru, fa (Farsi/RTL), ar (Arabic/RTL), es (Spanish), ne (Nepali), zh (Simplified Chinese)
 */
(function () {
  const STORAGE_KEY = 'nullvpn_lang';
  const DEFAULT_LANG = 'en';
  const RTL_LANGS = ['fa', 'ar'];

  const LANGS = {
    en: { label: 'EN', name: 'English',  flag: '🇬🇧' },
    ru: { label: 'RU', name: 'Русский',  flag: '🇷🇺' },
    fa: { label: 'فا', name: 'فارسی',   flag: '🇮🇷' },
    ar: { label: 'ع',  name: 'العربية',  flag: '🇸🇦' },
    es: { label: 'ES', name: 'Español',  flag: '🇪🇸' },
    ne: { label: 'ने', name: 'नेपाली',  flag: '🇳🇵' },
    zh: { label: '中', name: '中文',     flag: '🇨🇳' },
  };

  const T = {
    // ── NAV ─────────────────────────────────────────────────────────────────
    'nav.home':         { en:'Home',         ru:'Главная',       fa:'خانه',           ar:'الرئيسية',        es:'Inicio',           ne:'गृह',               zh:'首页' },
    'nav.features':     { en:'Features',     ru:'Возможности',   fa:'ویژگی‌ها',       ar:'المميزات',        es:'Características',  ne:'विशेषताहरू',        zh:'功能' },
    'nav.how':          { en:'How It Works', ru:'Как работает',  fa:'نحوه کار',        ar:'كيف يعمل',        es:'Cómo funciona',    ne:'कसरी काम गर्छ',    zh:'如何使用' },
    'nav.pricing':      { en:'Pricing',      ru:'Цены',          fa:'قیمت‌ها',         ar:'الأسعار',         es:'Precios',          ne:'मूल्य',             zh:'价格' },
    'nav.faq':          { en:'FAQ',          ru:'FAQ',           fa:'سوالات متداول',   ar:'الأسئلة الشائعة', es:'Preguntas',        ne:'सामान्य प्रश्नहरू', zh:'常见问题' },
    'nav.contact':      { en:'Contact',      ru:'Контакты',      fa:'تماس',            ar:'تواصل',           es:'Contacto',         ne:'सम्पर्क',           zh:'联系我们' },
    'nav.compare':      { en:'Compare',      ru:'Сравнение',     fa:'مقایسه',          ar:'المقارنة',        es:'Comparar',         ne:'तुलना',             zh:'对比' },
    'nav.whynull':      { en:'Why NullVPN',  ru:'Почему NullVPN',fa:'چرا NullVPN',     ar:'لماذا NullVPN',   es:'Por qué NullVPN',  ne:'NullVPN किन',       zh:'为何选择NullVPN' },
    'nav.cta':          { en:'Get Started',  ru:'Начать',        fa:'شروع کنید',       ar:'ابدأ الآن',       es:'Empezar',          ne:'सुरू गर्नुहोस्',   zh:'立即开始' },
    'nav.download':     { en:'Download App', ru:'Скачать',       fa:'دانلود برنامه',   ar:'تحميل التطبيق',  es:'Descargar App',    ne:'एप डाउनलोड',        zh:'下载应用' },
    'nav.cta.buy':      { en:'Buy Premium',  ru:'Купить подписку',fa:'خرید اشتراک',   ar:'اشترِ الباقة',    es:'Comprar Premium',  ne:'प्रीमियम किन्नुहोस्', zh:'购买高级版' },

    // ── INDEX ────────────────────────────────────────────────────────────────
    'index.badge':      { en:'✦ Not a regular VPN — something firewalls can\'t see', ru:'✦ Не обычный VPN — то, что файрволы не видят', fa:'✦ VPN معمولی نیست — چیزی که فایروال‌ها نمی‌بینند', ar:'✦ ليس VPN عادياً — شيء لا تراه جدران الحماية', es:'✦ No es una VPN normal — algo que los cortafuegos no pueden ver', ne:'✦ नियमित VPN होइन — फायरवलले देख्न सक्दैनन्', zh:'✦ 不是普通VPN — 防火墙无法识别' },
    'index.h1a':        { en:'Your VPN Gets Blocked.', ru:'Ваш VPN блокируют.', fa:'VPN شما مسدود می‌شود.', ar:'VPN الخاص بك يُحجب.', es:'Tu VPN se bloquea.', ne:'तपाईंको VPN ब्लक हुन्छ।', zh:'你的VPN被封锁。' },
    'index.h1b':        { en:'Ours Disappears.', ru:'Наш — незаметен.', fa:'مال ما ناپدید می‌شود.', ar:'وخاصتنا تختفي.', es:'El nuestro desaparece.', ne:'हाम्रो अदृश्य हुन्छ।', zh:'我们的无影无踪。' },
    'index.sub':        { en:'Industrial-grade private connectivity that works through corporate firewalls, national blocks, and hotel Wi-Fi.<br/>No registration. No credit card. Pay anonymously with TON.', ru:'Приватное подключение корпоративного уровня — через корпоративные файрволы, национальные блокировки и отельный Wi-Fi.<br/>Без регистрации. Без карты. Анонимная оплата TON.', fa:'اتصال خصوصی درجه‌صنعتی که از فایروال شرکتی، فیلتر ملی و وای‌فای هتل عبور می‌کند.<br/>بدون ثبت‌نام. بدون کارت. پرداخت ناشناس با TON.', ar:'اتصال خاص بمستوى صناعي يعمل عبر جدران الحماية ومرشحات وطنية وشبكات Wi-Fi في الفنادق.<br/>بدون تسجيل. بدون بطاقة. ادفع بشكل مجهول باستخدام TON.', es:'Conectividad privada de nivel industrial que funciona a través de firewalls corporativos, bloqueos nacionales y Wi-Fi de hoteles.<br/>Sin registro. Sin tarjeta de crédito. Paga de forma anónima con TON.', ne:'कर्पोरेट फायरवल, राष्ट्रिय ब्लक र होटल Wi-Fi मार्फत काम गर्ने निजी कनेक्शन।<br/>कुनै दर्ता छैन। कुनै कार्ड छैन। TON बाट गुमनाम भुगतान।', zh:'企业级私密连接，穿透企业防火墙、国家封锁和酒店Wi-Fi。<br/>无需注册，无需信用卡，TON匿名支付。' },
    'index.btn.get':    { en:'Get NullVPN — from $5 →', ru:'Получить NullVPN — от $5 →', fa:'دریافت NullVPN — از ۵ دلار →', ar:'احصل على NullVPN — من $5 →', es:'Obtener NullVPN — desde $5 →', ne:'NullVPN पाउनुहोस् — $5 बाट →', zh:'获取 NullVPN — 低至 $5 →' },
    'index.btn.compare':{ en:'See how we compare', ru:'Сравнить с другими', fa:'مقایسه با دیگران', ar:'انظر كيف نقارن', es:'Ver cómo nos comparamos', ne:'तुलना हेर्नुहोस्', zh:'查看对比' },
    'index.btn.how':    { en:'How it works', ru:'Как это работает', fa:'نحوه کار', ar:'كيف يعمل', es:'Cómo funciona', ne:'यो कसरी काम गर्छ', zh:'了解工作原理' },
    'index.trust1':     { en:'🔒 Zero logs', ru:'🔒 Нулевое логирование', fa:'🔒 صفر لاگ', ar:'🔒 سجلات صفرية', es:'🔒 Sin registros', ne:'🔒 शून्य लग', zh:'🔒 零日志' },
    'index.trust2':     { en:'⚡ 60-second setup', ru:'⚡ Настройка за 60 секунд', fa:'⚡ راه‌اندازی ۶۰ ثانیه‌ای', ar:'⚡ إعداد في 60 ثانية', es:'⚡ Configuración en 60 segundos', ne:'⚡ ६० सेकेन्ड सेटअप', zh:'⚡ 60秒设置' },
    'index.trust3':     { en:'🌍 Works where VPNs fail', ru:'🌍 Работает там, где VPN не работают', fa:'🌍 جایی کار می‌کند که VPN‌ها کار نمی‌کنند', ar:'🌍 يعمل حيث تفشل الـVPN الأخرى', es:'🌍 Funciona donde los VPN fallan', ne:'🌍 जहाँ VPN काम गर्दैनन् त्यहाँ काम गर्छ', zh:'🌍 在其他VPN失败的地方正常工作' },
    'index.trust4':     { en:'🧅 Tor-grade obfuscation', ru:'🧅 Обфускация уровня Tor', fa:'🧅 مبهم‌سازی در سطح Tor', ar:'🧅 تمويه على مستوى تور', es:'🧅 Ofuscación a nivel Tor', ne:'🧅 Tor-स्तरको ओभुसेसन', zh:'🧅 Tor级别混淆' },
    'index.sp':         { en:'Built for users in the world\'s most restricted networks', ru:'Создан для пользователей в самых закрытых сетях мира', fa:'ساخته شده برای کاربران در محدودترین شبکه‌های جهان', ar:'مصنوع لمستخدمي أكثر الشبكات تقييداً في العالم', es:'Creado para usuarios en las redes más restringidas del mundo', ne:'विश्वका सबैभन्दा प्रतिबन्धित नेटवर्कका प्रयोगकर्ताहरूका लागि बनाइएको', zh:'为全球最受限制网络中的用户而生' },
    'index.sp.tagline': { en:'Built for users in the world\'s most restricted networks', ru:'Для пользователей в самых закрытых сетях мира', fa:'برای کاربران محدودترین شبکه‌های جهان', ar:'لمستخدمي أكثر الشبكات تقييداً في العالم', es:'Para usuarios en las redes más restringidas del mundo', ne:'विश्वका सबैभन्दा प्रतिबन्धित नेटवर्कका प्रयोगकर्ताहरूका लागि', zh:'为全球最受限制网络中的用户而生' },
    'index.prob.h':     { en:'If you\'re here, you know the problem.', ru:'Если вы здесь — вы знаете проблему.', fa:'اگر اینجایی، می‌دانی مشکل چیست.', ar:'إذا كنت هنا، تعرف المشكلة.', es:'Si estás aquí, conoces el problema.', ne:'यहाँ हुनुहुन्छ भने समस्या थाहा छ।', zh:'如果你在这里，你就知道问题所在。' },
    'index.prob1':      { en:'Your VPN app was removed from the app store.', ru:'Ваш VPN-приложение удалили из магазина.', fa:'برنامه VPN شما از فروشگاه حذف شد.', ar:'تم إزالة تطبيق VPN الخاص بك من المتجر.', es:'Tu aplicación VPN fue eliminada de la tienda.', ne:'तपाईंको VPN एप स्टोरबाट हटाइयो।', zh:'你的VPN应用被从应用商店下架了。' },
    'index.prob2':      { en:'The VPN connects but nothing loads.', ru:'VPN подключается, но ничего не открывается.', fa:'VPN وصل می‌شود اما چیزی بارگذاری نمی‌شود.', ar:'يتصل الـVPN لكن لا شيء يُحمَّل.', es:'La VPN conecta pero nada carga.', ne:'VPN जोडिन्छ तर केही लोड हुँदैन।', zh:'VPN连接了但什么都加载不了。' },
    'index.prob3':      { en:'It worked yesterday. Today it\'s blocked.', ru:'Вчера работало. Сегодня — заблокировано.', fa:'دیروز کار می‌کرد. امروز مسدود شد.', ar:'كان يعمل أمس. اليوم محجوب.', es:'Funcionó ayer. Hoy está bloqueado.', ne:'हिजो काम गर्यो। आज ब्लक भयो।', zh:'昨天还能用，今天被封了。' },
    'index.prob4':      { en:'Your employer\'s firewall blocks everything.', ru:'Файрвол работодателя блокирует всё.', fa:'فایروال کارفرمای شما همه چیز را مسدود می‌کند.', ar:'جدار الحماية لصاحب العمل يحجب كل شيء.', es:'El firewall de tu empleador bloquea todo.', ne:'तपाईंको रोजगारदाताको फायरवलले सबै ब्लक गर्छ।', zh:'公司防火墙封锁了一切。' },
    'index.diff.h':     { en:'Built for users in the world\'s most restricted networks', ru:'Создан для пользователей в самых закрытых сетях мира', fa:'ساخته شده برای کاربران در محدودترین شبکه‌های جهان', ar:'مصنوع لمستخدمي أكثر الشبكات تقييداً في العالم', es:'Creado para usuarios en las redes más restringidas del mundo', ne:'विश्वका सबैभन्दा प्रतिबन्धित नेटवर्कका प्रयोगकर्ताहरूका लागि बनाइएको', zh:'为全球最受限制网络中的用户而生' },
    'index.f1.h':       { en:'Not a regular VPN', ru:'Не обычный VPN', fa:'VPN معمولی نیست', ar:'ليس VPN عادياً', es:'No es una VPN normal', ne:'नियमित VPN होइन', zh:'不是普通VPN' },
    'index.f1.p':       { en:'Routes through the same port every bank uses. Your traffic looks like normal secure web browsing. No VPN fingerprint for firewalls to detect.', ru:'Маршрутизируется через тот же порт, что используют банки. Трафик выглядит как обычный защищённый веб-серфинг.', fa:'از همان پورتی که بانک‌ها استفاده می‌کنند عبور می‌کند. ترافیک شما مثل مرور امن معمولی به نظر می‌رسد.', ar:'يمر عبر نفس المنفذ الذي تستخدمه البنوك. ترافيكك يبدو كتصفح ويب آمن عادي.', es:'Enruta por el mismo puerto que usan los bancos. Tu tráfico parece navegación web segura normal. Sin huella VPN.', ne:'बैंकहरूले प्रयोग गर्ने पोर्ट मार्फत राउट हुन्छ।', zh:'通过所有银行都使用的端口路由。你的流量看起来像正常的安全网页浏览。' },
    'index.f2.h':       { en:'Auto-failover. Always connected.', ru:'Авто-переключение. Всегда в сети.', fa:'تغییر خودکار. همیشه متصل.', ar:'تحويل تلقائي. متصل دائماً.', es:'Conmutación automática. Siempre conectado.', ne:'अटो-फेलओभर। सधैं जडित।', zh:'自动故障转移。始终连接。' },
    'index.f2.p':       { en:'If one tunnel gets blocked, NullVPN silently switches to another. You stay connected. You never notice it happened.', ru:'Если один туннель заблокирован, NullVPN тихо переключается на другой.', fa:'اگر یک تونل مسدود شود، NullVPN بی‌صدا به تونل دیگری تغییر می‌کند.', ar:'إذا تم حجب نفق، يتحول NullVPN بصمت إلى آخر. تبقى متصلاً دائماً.', es:'Si un túnel se bloquea, NullVPN cambia silenciosamente a otro. Sigues conectado.', ne:'एउटा टनल ब्लक भयो भने NullVPN चुपचाप अर्कोमा स्विच गर्छ।', zh:'一个隧道被封锁时，NullVPN会静默切换到另一个。你始终保持连接。' },
    'index.f3.h':       { en:'Free trial. Pay with fiat or crypto.', ru:'Бесплатный период. Оплата фиатом или криптой.', fa:'آزمایش رایگان. پرداخت با فیات یا رمزارز.', ar:'تجربة مجانية. الدفع بالعملة الورقية أو المشفرة.', es:'Prueba gratis. Paga con fiat o cripto.', ne:'नि:शुल्क परीक्षण। फियाट वा क्रिप्टोमा भुक्तान।', zh:'免费试用。用法币或加密货币支付。' },
    'index.f3.p':       { en:'No bank card required. No name. No transaction history linked to you. Pay with fiat or crypto from any wallet in seconds.', ru:'Без банковской карты. Без имени. Без истории транзакций. Оплата в крипто (TON, USDT) и фиат — рубли.', fa:'نیازی به کارت بانکی نیست. پرداخت با ارز ملی یا رمزارز (TON، USDT و غیره).', ar:'لا بطاقة بنكية. لا اسم. ادفع بالعملة المحلية أو المشفرة (TON وUSDT وغيرها).', es:'Sin tarjeta bancaria. Sin nombre. Paga con moneda local o cripto (TON, USDT, etc.).', ne:'बैंक कार्ड आवश्यक छैन। क्रिप्टो (TON, USDT) र फियातमा भुक्तान।', zh:'无需银行卡。用法币或加密货币（TON、USDT等）支付。' },
    'index.f4.h':       { en:'2 taps. Zero config.', ru:'2 нажатия. Ноль настроек.', fa:'۲ ضربه. بدون پیکربندی.', ar:'نقرتان. صفر إعدادات.', es:'2 toques. Sin configuración.', ne:'२ ट्याप। शून्य कन्फिग।', zh:'2次点击。零配置。' },
    'index.f4.p':       { en:'Pay, receive your personal connection link, tap Connect. No settings. No technical knowledge required.', ru:'Оплатите, получите ссылку, нажмите Подключить. Без настроек.', fa:'پرداخت کنید، لینک اتصال شخصی خود را دریافت کنید، Connect را بزنید.', ar:'ادفع، استلم رابط اتصالك الشخصي، اضغط اتصال. لا إعدادات.', es:'Paga, recibe tu enlace de conexión personal, toca Conectar. Sin configuración.', ne:'भुक्तान गर्नुहोस्, जडान लिङ्क पाउनुहोस्, Connect थिच्नुहोस्।', zh:'付款、收到连接链接、点击连接。无需设置。' },
    'index.feat.h':     { en:'Why NullVPN works where others don\'t.', ru:'Почему NullVPN работает там, где другие — нет.', fa:'چرا NullVPN جایی کار می‌کند که دیگران کار نمی‌کنند.', ar:'لماذا يعمل NullVPN حيث يفشل الآخرون.', es:'Por qué NullVPN funciona donde otros no.', ne:'किन NullVPN काम गर्छ जहाँ अरूले गर्दैनन्।', zh:'为什么NullVPN在其他工具失败的地方能正常工作。' },
    'index.feat.compare':{ en:'See NullVPN vs NordVPN, ExpressVPN, ProtonVPN →', ru:'NullVPN vs NordVPN, ExpressVPN, ProtonVPN →', fa:'NullVPN در مقابل NordVPN، ExpressVPN، ProtonVPN →', ar:'NullVPN مقابل NordVPN وExpressVPN وProtonVPN →', es:'NullVPN vs NordVPN, ExpressVPN, ProtonVPN →', ne:'NullVPN vs NordVPN, ExpressVPN, ProtonVPN →', zh:'查看NullVPN对比NordVPN、ExpressVPN、ProtonVPN →' },
    'index.notavpn.h':  { en:'Why regular VPNs keep getting blocked', ru:'Почему обычные VPN продолжают блокироваться', fa:'چرا VPN‌های معمولی مسدود می‌شوند', ar:'لماذا يتم حجب VPN التقليدية باستمرار', es:'Por qué los VPN normales siguen siendo bloqueados', ne:'किन नियमित VPN ब्लक हुँदै रहन्छन्', zh:'为什么普通VPN一再被封锁' },
    'index.notavpn.p':  { en:'Deep Packet Inspection systems identify standard VPN protocols within hours. Known IP ranges get blocklisted. App stores remove VPN apps under government pressure. Consumer VPNs are in an arms race they keep losing.', ru:'Системы DPI распознают стандартные VPN-протоколы за часы. Известные IP попадают в чёрные списки. App Store удаляют VPN-приложения по требованию властей.', fa:'سیستم‌های DPI پروتکل‌های VPN استاندارد را در عرض چند ساعت شناسایی می‌کنند.', ar:'تحدد أنظمة DPI بروتوكولات VPN القياسية في غضون ساعات. نطاقات IP المعروفة تُحجب.', es:'Los sistemas DPI identifican los protocolos VPN estándar en horas. Los rangos de IP conocidos se bloquean.', ne:'DPI प्रणालीहरूले घण्टौंमै VPN प्रोटोकल पहिचान गर्छन्।', zh:'深度包检测系统在数小时内识别标准VPN协议。已知IP段被列入黑名单。' },
    'index.notavpn.p2': { en:'NullVPN routes through the same port used by every bank, hospital, and e-commerce site globally. To a firewall, your traffic is indistinguishable from secure web browsing. <strong>There is no VPN signature to detect.</strong>', ru:'NullVPN маршрутизируется через порт банков и больниц. <strong>Нет VPN-сигнатуры для обнаружения.</strong>', fa:'NullVPN از همان پورتی عبور می‌کند که بانک‌ها استفاده می‌کنند. <strong>هیچ امضای VPN برای شناسایی وجود ندارد.</strong>', ar:'يمر NullVPN عبر نفس المنفذ الذي تستخدمه البنوك. <strong>لا توجد بصمة VPN للكشف عنها.</strong>', es:'NullVPN enruta por el mismo puerto que usan los bancos. <strong>No hay firma VPN que detectar.</strong>', ne:'NullVPN बैंकहरूले प्रयोग गर्ने पोर्ट मार्फत राउट हुन्छ। <strong>पत्ता लगाउने कुनै VPN सिग्नेचर छैन।</strong>', zh:'NullVPN通过银行使用的端口路由。<strong>没有可检测的VPN特征。</strong>' },
    'index.notavpn.btn':{ en:'Full technical comparison →', ru:'Полное техническое сравнение →', fa:'مقایسه کامل فنی →', ar:'المقارنة التقنية الكاملة →', es:'Comparación técnica completa →', ne:'पूर्ण प्राविधिक तुलना →', zh:'完整技术对比 →' },
    'index.cta.h':      { en:'Stop playing VPN whack-a-mole.', ru:'Прекратите играть в кошки-мышки с VPN.', fa:'دیگر بازی موش و گربه با VPN را رها کنید.', ar:'توقف عن لعبة الصواريخ مع VPN.', es:'Deja de jugar al gato y al ratón con VPNs.', ne:'VPN को लुकामारी खेल बन्द गर्नुहोस्।', zh:'停止与VPN封锁玩打地鼠游戏。' },
    'index.cta.p':      { en:'Get a connection that actually works. From $5/month. Cancel anytime.', ru:'Получите соединение, которое реально работает. От $5 в месяц.', fa:'اتصالی بگیرید که واقعاً کار می‌کند. از ۵ دلار در ماه.', ar:'احصل على اتصال يعمل فعلاً. من $5 شهرياً. إلغاء في أي وقت.', es:'Obtén una conexión que realmente funcione. Desde $5/mes.', ne:'वास्तवमा काम गर्ने जडान पाउनुहोस्। $5/महिनाबाट।', zh:'获得真正有效的连接。每月低至$5。随时取消。' },
    'index.cta.btn':    { en:'Get NullVPN →', ru:'Получить NullVPN →', fa:'دریافت NullVPN →', ar:'احصل على NullVPN →', es:'Obtener NullVPN →', ne:'NullVPN पाउनुहोस् →', zh:'获取 NullVPN →' },

    // ── PAYMENT ──────────────────────────────────────────────────────────────
    'index.payment':    { en:'Pay with crypto (TON, USDT, etc.) or fiat — rubles.', ru:'Оплата: крипто (TON, USDT и др) или фиат — рубли.', fa:'پرداخت با رمزارز (TON، USDT و غیره) یا ارز ملی — روبل.', ar:'الدفع بالعملة المشفرة (TON وUSDT) أو بالعملة الورقية — روبل.', es:'Paga con cripto (TON, USDT, etc.) o fiat — rublos.', ne:'क्रिप्टो (TON, USDT आदि) वा फियात — रुबलमा भुक्तान।', zh:'用加密货币（TON、USDT等）或法币——卢布支付。' },

    // ── COUNTRIES SECTION ────────────────────────────────────────────────────
    'index.countries.h':      { en:'Works in the world\'s most restricted countries.', ru:'Работает в самых закрытых странах мира.', fa:'در محدودترین کشورهای جهان کار می‌کند.', ar:'يعمل في أكثر البلدان تقييداً للإنترنت.', es:'Funciona en los países más censurados del mundo.', ne:'विश्वका सबैभन्दा प्रतिबन्धित देशहरूमा काम गर्छ।', zh:'在全球管控最严格的国家正常运行。' },
    'index.countries.tagline':{ en:'If your country is on this list — NullVPN was built for you.', ru:'Если ваша страна в этом списке — NullVPN создан для вас.', fa:'اگر کشور شما در این لیست است — NullVPN برای شما ساخته شده است.', ar:'إذا كانت دولتك في هذه القائمة — فإن NullVPN صُنع من أجلك.', es:'Si tu país está en esta lista — NullVPN fue creado para ti.', ne:'यदि तपाईंको देश यस सूचीमा छ — NullVPN तपाईंकै लागि बनाइएको हो।', zh:'如果你的国家在这个列表上——NullVPN就是为你而生的。' },

    // ── FOOTER ───────────────────────────────────────────────────────────────
    'footer.tagline':   { en:'Private internet for everyone, everywhere.', ru:'Приватный интернет для всех и везде.', fa:'اینترنت خصوصی برای همه، همه جا.', ar:'إنترنت خاص للجميع، في كل مكان.', es:'Internet privado para todos, en todas partes.', ne:'सबैका लागि, हरतिर निजी इन्टरनेट।', zh:'为所有人提供无处不在的私密互联网。' },
    'footer.pages':     { en:'Pages', ru:'Страницы', fa:'صفحات', ar:'الصفحات', es:'Páginas', ne:'पृष्ठहरू', zh:'页面' },
    'footer.legal':     { en:'Legal', ru:'Юридическое', fa:'قانونی', ar:'قانوني', es:'Legal', ne:'कानूनी', zh:'法律' },
    'footer.privacy':   { en:'Privacy Policy', ru:'Политика конфиденциальности', fa:'سیاست حریم خصوصی', ar:'سياسة الخصوصية', es:'Política de Privacidad', ne:'गोपनीयता नीति', zh:'隐私政策' },
    'footer.terms':     { en:'Terms of Service', ru:'Условия использования', fa:'شرایط خدمات', ar:'شروط الخدمة', es:'Términos de Servicio', ne:'सेवाका सर्तहरू', zh:'服务条款' },
    'footer.copy':      { en:'© 2026 NullVPN. Available on Web2, TON Web3, and all HTTP networks.', ru:'© 2026 NullVPN. Доступен в Web2, TON Web3 и всех HTTP-сетях.', fa:'© ۲۰۲۶ NullVPN. در دسترس در Web2، TON Web3، و تمام شبکه‌های HTTP.', ar:'© 2026 NullVPN. متاح على Web2 وTON Web3 وجميع شبكات HTTP.', es:'© 2026 NullVPN. Disponible en Web2, TON Web3 y todas las redes HTTP.', ne:'© 2026 NullVPN. Web2, TON Web3, र सबै HTTP नेटवर्कमा उपलब्ध।', zh:'© 2026 NullVPN。可在Web2、TON Web3及所有HTTP网络上使用。' },
    'footer.payment':   { en:'Payments: crypto (TON, USDT, etc.) · fiat — rubles', ru:'Оплата: крипто (TON, USDT и др) · фиат — рубли', fa:'پرداخت: رمزارز (TON، USDT و غیره) · ارز ملی — روبل', ar:'الدفع: عملة مشفرة (TON وUSDT) · عملة ورقية — روبل', es:'Pagos: cripto (TON, USDT, etc.) · fiat — rublos', ne:'भुक्तान: क्रिप्टो (TON, USDT आदि) · फियात — रुबल', zh:'支付方式：加密货币（TON、USDT等）· 法币——卢布' },

    // ── FEATURES PAGE ────────────────────────────────────────────────────────
    'feat.h1a':         { en:'Everything you need.', ru:'Всё необходимое.', fa:'هر آنچه نیاز دارید.', ar:'كل ما تحتاجه.', es:'Todo lo que necesitas.', ne:'तपाईंलाई चाहिएको सबै।', zh:'你需要的一切。' },
    'feat.h1b':         { en:"Nothing you don't.", ru:'Ничего лишнего.', fa:'چیزی که نیاز ندارید نیست.', ar:'لا شيء لا تحتاجه.', es:'Nada que no necesites.', ne:'जे चाहिँदैन त्यो केही पनि होइन।', zh:'没有多余的东西。' },
    'feat.sub':         { en:'Built for one purpose — getting you online privately, wherever you are.', ru:'Создан для одной цели — обеспечить вам приватный доступ к интернету, где бы вы ни были.', fa:'برای یک هدف ساخته شده است — اتصال خصوصی شما به اینترنت، هر کجا که هستید.', ar:'بُني لغرض واحد — إيصالك بالإنترنت بشكل خاص، أينما كنت.', es:'Creado con un propósito: conectarte a internet de forma privada, dondequiera que estés.', ne:'एउटै उद्देश्यका लागि बनाइएको — तपाईंलाई अनलाइन निजी रूपमा ल्याउन, जहाँ भए पनि।', zh:'只为一个目标而生——让你随时随地私密上网。' },
    'feat.tag1':        { en:'Privacy', ru:'Приватность', fa:'حریم خصوصی', ar:'الخصوصية', es:'Privacidad', ne:'गोपनीयता', zh:'隐私' },
    'feat.r1.h':        { en:'Absolute zero logs', ru:'Полное отсутствие логов', fa:'عدم ثبت مطلق هیچ لاگی', ar:'صفر سجلات مطلق', es:'Cero registros absolutos', ne:'पूर्ण शून्य लगहरू', zh:'绝对零日志' },
    'feat.r1.p':        { en:"We have no idea who you are, what sites you visit, or when you connect. No email required. No name. No phone number.", ru:'Мы не знаем, кто вы, какие сайты посещаете или когда подключаетесь. Email не требуется. Имя не нужно. Номер телефона не нужен.', fa:'ما هیچ ایده‌ای نداریم که شما کی هستید، به چه سایت‌هایی می‌روید یا چه زمانی وصل می‌شوید. نیازی به ایمیل نیست. نامی نیاز نیست. شماره تلفنی نیاز نیست.', ar:'ليس لدينا أي فكرة عن هويتك أو المواقع التي تزورها أو متى تتصل. لا بريد إلكتروني مطلوب. لا اسم. لا رقم هاتف.', es:'No tenemos idea de quién eres, qué sitios visitas o cuándo te conectas. No se requiere email. Sin nombre. Sin número de teléfono.', ne:'हामीलाई थाहा छैन तपाईं को हुनुहुन्छ, कुन साइटहरू भ्रमण गर्नुहुन्छ वा कहिले जडान हुनुहुन्छ। कुनै इमेल आवश्यक छैन। कुनै नाम छैन। कुनै फोन नम्बर छैन।', zh:'我们不知道你是谁、访问什么网站或何时连接。无需邮箱，无需姓名，无需电话号码。' },
    'feat.tag2':        { en:'Reliability', ru:'Надёжность', fa:'قابلیت اطمینان', ar:'الموثوقية', es:'Fiabilidad', ne:'विश्वसनीयता', zh:'可靠性' },
    'feat.r2.h':        { en:"Works where others don't", ru:'Работает там, где другие не работают', fa:'جایی کار می‌کند که دیگران کار نمی‌کنند', ar:'يعمل حيث لا يعمل الآخرون', es:'Funciona donde otros no', ne:'अरूले काम नगर्ने ठाउँमा काम गर्छ', zh:'在其他工具失败的地方正常工作' },
    'feat.r2.p':        { en:"Uses advanced obfuscation that disguises traffic as normal web activity. Specifically designed for Iran, Russia, China, and similar environments.", ru:'Использует продвинутую обфускацию, маскирующую трафик под обычную веб-активность. Специально разработан для Ирана, России, Китая и подобных сред.', fa:'از مبهم‌سازی پیشرفته استفاده می‌کند که ترافیک را به عنوان فعالیت وب عادی نشان می‌دهد. مخصوصاً برای ایران، روسیه، چین و محیط‌های مشابه طراحی شده است.', ar:'يستخدم تمويهاً متقدماً يخفي حركة المرور كنشاط ويب عادي. مصمم خصيصاً لإيران وروسيا والصين والبيئات المماثلة.', es:'Usa ofuscación avanzada que disfraza el tráfico como actividad web normal. Diseñado específicamente para Irán, Rusia, China y entornos similares.', ne:'ट्राफिकलाई सामान्य वेब गतिविधिजस्तो देखाउन उन्नत ओभुसेसन प्रयोग गर्छ। विशेष गरी इरान, रूस, चीन र यस्ता वातावरणका लागि डिजाइन गरिएको।', zh:'使用高级混淆技术将流量伪装成正常网页活动。专为伊朗、俄罗斯、中国及类似环境设计。' },
    'feat.tag3':        { en:'Payments', ru:'Оплата', fa:'پرداخت‌ها', ar:'المدفوعات', es:'Pagos', ne:'भुक्तानहरू', zh:'支付' },
    'feat.r3.h':        { en:'Pay without a trace', ru:'Оплата без следа', fa:'پرداخت بدون ردپا', ar:'ادفع بدون أثر', es:'Paga sin dejar rastro', ne:'कुनै पत्ता बिना भुक्तान गर्नुहोस्', zh:'无痕迹支付' },
    'feat.r3.p':        { en:'TON cryptocurrency only. No bank card. No PayPal. No identity. Payments processed automatically — no human involved.', ru:'Только криптовалюта TON. Без банковских карт. Без PayPal. Без идентификации. Платежи обрабатываются автоматически — без участия человека.', fa:'فقط رمزارز TON. بدون کارت بانکی. بدون پی‌پال. بدون هویت. پرداخت‌ها به صورت خودکار پردازش می‌شوند — بدون دخالت انسان.', ar:'عملة TON المشفرة فقط. لا بطاقات بنكية. لا PayPal. لا هوية. تتم معالجة المدفوعات تلقائياً — بدون تدخل بشري.', es:'Solo criptomoneda TON. Sin tarjetas bancarias. Sin PayPal. Sin identidad. Los pagos se procesan automáticamente — sin intervención humana.', ne:'TON क्रिप्टोकरेन्सी मात्र। बैंक कार्ड छैन। PayPal छैन। परिचय छैन। भुक्तानहरू स्वचालित रूपमा प्रशोधन गरिन्छ — कुनै मानिस संलग्न छैन।', zh:'仅支持TON加密货币。无需银行卡，无需PayPal，无需身份验证。支付自动处理——无人工参与。' },
    'feat.tag4':        { en:'Speed', ru:'Скорость', fa:'سرعت', ar:'السرعة', es:'Velocidad', ne:'गति', zh:'速度' },
    'feat.r4.h':        { en:'Fast enough for video calls', ru:'Достаточно быстро для видеозвонков', fa:'به اندازه کافی سریع برای تماس‌های ویدیویی', ar:'سريع بما يكفي لمكالمات الفيديو', es:'Lo suficientemente rápido para videollamadas', ne:'भिडियो कलका लागि पर्याप्त द्रुत', zh:'速度快到足以进行视频通话' },
    'feat.r4.p':        { en:'Premium European servers optimized for low latency to Russia, Iran, and the Middle East. Streaming, video calls, and browsing at full speed.', ru:'Премиальные европейские серверы оптимизированы для низкой задержки до России, Ирана и Ближнего Востока. Стриминг, видеозвонки и просмотр на полной скорости.', fa:'سرورهای اروپایی پریمیوم بهینه‌شده برای تأخیر کم به روسیه، ایران و خاورمیانه. استریم، تماس‌های ویدیویی و مرور با سرعت کامل.', ar:'خوادم أوروبية متميزة محسّنة لتقليل زمن الوصول إلى روسيا وإيران والشرق الأوسط. بث ومكالمات فيديو وتصفح بأقصى سرعة.', es:'Servidores europeos premium optimizados para baja latencia hacia Rusia, Irán y Oriente Medio. Streaming, videollamadas y navegación a máxima velocidad.', ne:'रूस, इरान र मध्य पूर्वका लागि कम लेटेन्सी अनुकूलित प्रिमियम युरोपेली सर्भरहरू। पूर्ण गतिमा स्ट्रिमिङ, भिडियो कल र ब्राउजिङ।', zh:'优质欧洲服务器针对俄罗斯、伊朗和中东优化低延迟。全速流媒体、视频通话和浏览。' },
    'feat.tag5':        { en:'Accessibility', ru:'Доступность', fa:'دسترسی‌پذیری', ar:'إمكانية الوصول', es:'Accesibilidad', ne:' पहुँचयोग्यता', zh:'可访问性' },
    'feat.r5.h':        { en:'Multiple ways to connect', ru:'Несколько способов подключения', fa:'روش‌های متعدد برای اتصال', ar:'طرق متعددة للاتصال', es:'Múltiples formas de conectarse', ne:'जडान गर्ने धेरै तरिकाहरू', zh:'多种连接方式' },
    'feat.r5.p':        { en:'Telegram bot, Android app, Web2 site, or TON Web3. If one channel is blocked, others still work.', ru:'Telegram-бот, Android-приложение, Web2-сайт или TON Web3. Если один канал заблокирован, другие продолжают работать.', fa:'ربات تلگرام، اپلیکیشن اندروید، سایت Web2 یا TON Web3. اگر یک کانال مسدود شود، سایر کانال‌ها همچنان کار می‌کنند.', ar:'بوت تيليجرام، تطبيق أندرويد، موقع Web2 أو TON Web3. إذا تم حجب قناة واحدة، لا تزال القنوات الأخرى تعمل.', es:'Bot de Telegram, aplicación Android, sitio Web2 o TON Web3. Si un canal está bloqueado, los demás siguen funcionando.', ne:'टेलिग्राम बट, एन्ड्रोइड एप, Web2 साइट वा TON Web3। एउटा च्यानल ब्लक भए पनि अरू काम गर्छन्।', zh:'Telegram机器人、Android应用、Web2网站或TON Web3。如果一个通道被封锁，其他通道仍可工作。' },
    'feat.cta.h':       { en:'Ready to browse freely?', ru:'Готовы свободно просматривать?', fa:'آماده مرور آزاد هستید؟', ar:'مستعد للتصفح بحرية؟', es:'¿Listo para navegar libremente?', ne:'स्वतन्त्र रूपमा ब्राउज गर्न तयार?', zh:'准备好自由浏览了吗？' },
    'feat.cta.p':       { en:'Join thousands of users already connected.', ru:'Присоединяйтесь к тысячам уже подключённых пользователей.', fa:'به هزاران کاربری که هم‌اکنون متصل هستند بپیوندید.', ar:'انضم إلى آلاف المستخدمين المتصلين بالفعل.', es:'Únete a miles de usuarios ya conectados.', ne:'पहिले नै जडान भएका हजारौं प्रयोगकर्ताहरूमा सामेल हुनुहोस्।', zh:'加入数千名已连接用户的行列。' },
    'feat.cta.btn':     { en:'See Pricing →', ru:'Смотреть цены →', fa:'مشاهده قیمت‌ها →', ar:'انظر الأسعار →', es:'Ver precios →', ne:'मूल्यहरू हेर्नुहोस् →', zh:'查看价格 →' },
  };

  function t(key, lang) {
    const entry = T[key];
    if (!entry) return key;
    return entry[lang] || entry['en'] || key;
  }

  function applyLang(lang) {
    if (!LANGS[lang]) lang = DEFAULT_LANG;
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('data-lang', lang);
    if (RTL_LANGS.includes(lang)) {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
    }
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key, lang);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = val;
      } else {
        el.innerHTML = val;
      }
    });
    document.querySelectorAll('.lang-btn').forEach(btn => {
      const m = btn.getAttribute('onclick') && btn.getAttribute('onclick').match(/setLang\('(\w+)'\)/);
      if (m) btn.classList.toggle('active', m[1] === lang);
    });
    // Save to localStorage only if available (will fail silently in incognito/private mode)
    try { localStorage.setItem(STORAGE_KEY, lang); } catch(e) {}
    // Update URL without page reload for language persistence across navigation
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.history.replaceState({}, '', url.toString());
  }

  window.setLang = function(lang) { applyLang(lang); };

  (function() {
    let lang = DEFAULT_LANG;
    // Priority: 1) URL parameter, 2) localStorage, 3) default
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang && LANGS[urlLang]) {
      lang = urlLang;
    } else {
      try { lang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; } catch(e) {}
    }
    if (!LANGS[lang]) lang = DEFAULT_LANG;
    applyLang(lang);
  })();

})();
