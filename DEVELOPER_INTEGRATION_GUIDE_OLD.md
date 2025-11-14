# 🚀 JackpotX Enterprise Features - Integration Guide pentru Frontend & Admin

## 📋 Cuprins
1. [Introducere](#introducere)
2. [API Endpoints Disponibile](#api-endpoints-disponibile)
3. [Responsible Gaming - Integrare Frontend](#responsible-gaming-frontend)
4. [Responsible Gaming - Integrare Admin](#responsible-gaming-admin)
5. [Multilanguage System](#multilanguage-system)
6. [Metadata APIs](#metadata-apis)
7. [CMS System](#cms-system)
8. [IP Tracking & Security](#ip-tracking-security)
9. [Exemple de Cod](#exemple-cod)
10. [Structura Tabelelor](#structura-tabelelor)

---

## 1. Introducere

Acest document descrie toate **enterprise features** implementate în backend și cum să le integrezi în:
- **Frontend (React/Next.js)** - Pentru jucători
- **Admin Panel** - Pentru operatori/administratori

**Base URL**: `https://backend.jackpotx.net/api/v1`

**Autentificare**: Toate endpoint-urile protejate necesită header:
```
Authorization: Bearer {JWT_TOKEN}
```

---

## 2. API Endpoints Disponibile

### 2.1 Responsible Gaming (Joc Responsabil)

#### **Deposit Limits** (Limite de Depunere)
```
GET    /api/v1/responsible-gaming/deposit-limits        - Obține limitele active ale jucătorului
POST   /api/v1/responsible-gaming/deposit-limits        - Setează o nouă limită
PUT    /api/v1/responsible-gaming/deposit-limits/:id    - Actualizează o limită existentă
DELETE /api/v1/responsible-gaming/deposit-limits/:id    - Șterge o limită
GET    /api/v1/responsible-gaming/deposit-limits/check  - Verifică dacă suma poate fi depusă
```

#### **Self-Exclusion** (Auto-Excludere)
```
GET    /api/v1/responsible-gaming/self-exclusions           - Obține perioada de auto-excludere activă
POST   /api/v1/responsible-gaming/self-exclusions           - Activează auto-excludere
GET    /api/v1/responsible-gaming/self-exclusions/:id       - Detalii auto-excludere
DELETE /api/v1/responsible-gaming/self-exclusions/:id/early - Încheiere anticipată (necesită aprobare admin)
```

#### **Reality Checks** (Verificări de Realitate)
```
GET    /api/v1/responsible-gaming/reality-checks         - Obține setările de reality check
POST   /api/v1/responsible-gaming/reality-checks         - Activează reality check
PUT    /api/v1/responsible-gaming/reality-checks/:id     - Actualizează setările
DELETE /api/v1/responsible-gaming/reality-checks/:id     - Dezactivează reality check
POST   /api/v1/responsible-gaming/reality-checks/trigger - Trigger manual pentru testare
```

#### **Admin Endpoints** (pentru Admin Panel)
```
GET    /api/v1/responsible-gaming/admin/deposit-limits      - Toate limitele din sistem
GET    /api/v1/responsible-gaming/admin/self-exclusions     - Toate auto-excluderile
PUT    /api/v1/responsible-gaming/admin/self-exclusions/:id - Actualizează status auto-excludere
GET    /api/v1/responsible-gaming/admin/reality-checks      - Toate reality checks din sistem
GET    /api/v1/responsible-gaming/admin/stats               - Statistici generale
```

---

### 2.2 Multilanguage System

#### **Traduceri**
```
GET    /api/v1/multilanguage/translations/:lang             - Toate traducerile pentru o limbă
POST   /api/v1/multilanguage/translations/:lang/:key        - Creează/actualizează traducere
GET    /api/v1/multilanguage/translations/:lang/:key        - Obține traducere specifică
DELETE /api/v1/multilanguage/translations/:lang/:key        - Șterge traducere
POST   /api/v1/multilanguage/translations/bulk              - Import bulk traduceri
POST   /api/v1/multilanguage/translations/cache/clear       - Curăță cache-ul traducerilor
```

#### **Limbi Disponibile**
```
GET    /api/v1/multilanguage/languages                      - Toate limbile suportate
POST   /api/v1/multilanguage/languages                      - Adaugă o limbă nouă
PUT    /api/v1/multilanguage/languages/:code                - Actualizează limbă
DELETE /api/v1/multilanguage/languages/:code                - Dezactivează limbă
```

**Limbi pre-configurate**: `en`, `ro`, `es`, `de`, `fr`, `it`, `pt`, `ru`, `tr`, `zh`

---

### 2.3 Metadata APIs

#### **Currencies** (Valute)
```
GET    /api/v1/metadata/currencies              - Toate valutele (FIAT + CRYPTO)
GET    /api/v1/metadata/currencies/fiat         - Doar FIAT currencies
GET    /api/v1/metadata/currencies/crypto       - Doar Cryptocurrencies (18 OxaPay)
GET    /api/v1/metadata/currencies/:code        - Detalii valută specifică
POST   /api/v1/metadata/currencies              - Adaugă valută nouă (Admin)
PUT    /api/v1/metadata/currencies/:code        - Actualizează valută (Admin)
```

**Crypto suportate**: BTC, ETH, USDT, USDC, BNB, DOGE, POL, LTC, SOL, TRX, SHIB, TON, XMR, DAI, BCH, NOT, DOGS, XRP

#### **Countries** (Țări)
```
GET    /api/v1/metadata/countries               - Toate țările
GET    /api/v1/metadata/countries/:code         - Detalii țară specifică
GET    /api/v1/metadata/countries/continent/:continent - Țări pe continent
```

#### **Mobile Prefixes** (Prefixe Telefonice)
```
GET    /api/v1/metadata/mobile-prefixes         - Toate prefixele
GET    /api/v1/metadata/mobile-prefixes/country/:code - Prefixe pentru o țară
```

#### **Languages** (Limbi)
```
GET    /api/v1/metadata/languages               - Toate limbile din sistem
```

---

### 2.4 CMS System

#### **Pages** (Pagini CMS)
```
GET    /api/v1/cms/pages                        - Lista pagini (publice + draft dacă ești admin)
GET    /api/v1/cms/pages/:slug                  - Obține pagină după slug (ex: /terms-and-conditions)
POST   /api/v1/cms/pages                        - Creează pagină nouă (Admin)
PUT    /api/v1/cms/pages/:id                    - Actualizează pagină (Admin)
DELETE /api/v1/cms/pages/:id                    - Șterge pagină (Admin)
POST   /api/v1/cms/pages/:id/publish            - Publică pagină (Admin)
POST   /api/v1/cms/pages/:id/unpublish          - Unpublish pagină (Admin)
```

**Template-uri disponibile**: `default`, `full_width`, `sidebar_left`, `sidebar_right`, `landing_page`

#### **Banners** (Bannere Promoționale)
```
GET    /api/v1/cms/banners                      - Bannere active (filtru: position, category)
GET    /api/v1/cms/banners/:id                  - Detalii banner
POST   /api/v1/cms/banners                      - Creează banner (Admin)
PUT    /api/v1/cms/banners/:id                  - Actualizează banner (Admin)
DELETE /api/v1/cms/banners/:id                  - Șterge banner (Admin)
POST   /api/v1/cms/banners/:id/click            - Track click pe banner
```

**Poziții banner**: `homepage_hero`, `homepage_middle`, `sidebar`, `footer`, `modal`, `games_page`, `promotions_page`

---

### 2.5 IP Tracking & Security

**Middleware automat**: Toate request-urile sunt loggate automat cu IP, User-Agent, acțiune.

#### **View Logs** (Admin)
```
GET    /api/v1/admin/ip-tracking/logs           - Toate log-urile IP
GET    /api/v1/admin/ip-tracking/logs/user/:userId - Log-uri pentru un user
GET    /api/v1/admin/ip-tracking/suspicious     - Activități suspecte
```

**Frontend**: Trimite IP-ul public în header:
```javascript
headers: {
  'X-Public-IP': userPublicIP
}
```

---

## 3. Responsible Gaming - Integrare Frontend

### 3.1 Deposit Limits (Limite Depunere)

**Scenariu**: Jucătorul vrea să seteze o limită zilnică de 100 EUR.

#### **Step 1: Afișează limitele existente**

```javascript
// React Component - Deposit Limits Settings
import { useState, useEffect } from 'react';

const DepositLimitsSettings = () => {
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepositLimits();
  }, []);

  const fetchDepositLimits = async () => {
    try {
      const response = await fetch('https://backend.jackpotx.net/api/v1/responsible-gaming/deposit-limits', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setLimits(data.data);
      }
    } catch (error) {
      console.error('Error fetching deposit limits:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deposit-limits">
      <h2>Limite de Depunere Active</h2>
      {limits.length === 0 ? (
        <p>Nu ai setat nicio limită încă.</p>
      ) : (
        <ul>
          {limits.map(limit => (
            <li key={limit.id}>
              <strong>{limit.period_type}</strong>:
              {limit.amount_limit} {limit.currency}
              (Folosit: {limit.amount_used})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

#### **Step 2: Setare limită nouă**

```javascript
const setNewDepositLimit = async (periodType, amount, currency = 'USD') => {
  try {
    const response = await fetch('https://backend.jackpotx.net/api/v1/responsible-gaming/deposit-limits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        period_type: periodType,  // 'daily', 'weekly', 'monthly'
        amount_limit: amount,
        currency: currency
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('Limită setată cu succes!');
      fetchDepositLimits(); // Reîncarcă lista
    } else {
      alert(`Eroare: ${data.message}`);
    }
  } catch (error) {
    console.error('Error setting deposit limit:', error);
  }
};

// Exemplu de apel
setNewDepositLimit('daily', 100, 'EUR');
```

#### **Step 3: Verificare înainte de depunere**

```javascript
// În componenta de Deposit
const handleDeposit = async (amount) => {
  try {
    // Verifică dacă suma respectă limitele
    const checkResponse = await fetch(
      `https://backend.jackpotx.net/api/v1/responsible-gaming/deposit-limits/check?amount=${amount}`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      }
    );

    const checkData = await checkResponse.json();

    if (!checkData.success) {
      alert(`Depunerea nu poate fi procesată: ${checkData.message}`);
      return;
    }

    if (!checkData.data.can_deposit) {
      alert(`Ai depășit limita ${checkData.data.exceeded_limit.period_type}. ` +
            `Limită: ${checkData.data.exceeded_limit.amount_limit} ` +
            `Folosit: ${checkData.data.exceeded_limit.amount_used}`);
      return;
    }

    // Continuă cu depunerea normală
    proceedWithDeposit(amount);

  } catch (error) {
    console.error('Error checking deposit limit:', error);
  }
};
```

---

### 3.2 Self-Exclusion (Auto-Excludere)

**Scenariu**: Jucătorul vrea să se auto-excludă pentru 30 zile.

```javascript
const activateSelfExclusion = async (days, reason = 'Personal choice') => {
  try {
    const response = await fetch('https://backend.jackpotx.net/api/v1/responsible-gaming/self-exclusions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        duration_days: days,  // 7, 14, 30, 60, 90, 180, 365, sau null pentru permanent
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('Auto-excluderea a fost activată cu succes!');
      // Redirect către pagina de logout/confirmare
      window.location.href = '/self-exclusion-confirmed';
    } else {
      alert(`Eroare: ${data.message}`);
    }
  } catch (error) {
    console.error('Error activating self-exclusion:', error);
  }
};

// Exemplu de apel
activateSelfExclusion(30, 'Doresc o pauză de la jocuri');
```

**Verificare status auto-excludere**:
```javascript
const checkSelfExclusion = async () => {
  try {
    const response = await fetch('https://backend.jackpotx.net/api/v1/responsible-gaming/self-exclusions', {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    const data = await response.json();

    if (data.success && data.data.length > 0) {
      const exclusion = data.data[0];

      if (exclusion.status === 'ACTIVE') {
        // Utilizatorul este auto-exclus
        return {
          isExcluded: true,
          expiresAt: exclusion.expires_at,
          reason: exclusion.reason
        };
      }
    }

    return { isExcluded: false };

  } catch (error) {
    console.error('Error checking self-exclusion:', error);
    return { isExcluded: false };
  }
};
```

---

### 3.3 Reality Checks (Verificări Realitate)

**Scenariu**: Afișează un popup la fiecare 60 minute cu timpul jucat și banii cheltuiți.

```javascript
const activateRealityCheck = async (intervalMinutes = 60) => {
  try {
    const response = await fetch('https://backend.jackpotx.net/api/v1/responsible-gaming/reality-checks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        interval_minutes: intervalMinutes,  // 15, 30, 60, 120
        is_enabled: true
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('Reality Check activat! Vei primi notificări la fiecare ' + intervalMinutes + ' minute.');
      startRealityCheckTimer(intervalMinutes);
    } else {
      alert(`Eroare: ${data.message}`);
    }
  } catch (error) {
    console.error('Error activating reality check:', error);
  }
};

// Timer local pentru reality check
let realityCheckTimer;

const startRealityCheckTimer = (intervalMinutes) => {
  clearInterval(realityCheckTimer);

  realityCheckTimer = setInterval(() => {
    showRealityCheckModal();
  }, intervalMinutes * 60 * 1000);
};

const showRealityCheckModal = async () => {
  try {
    // Trigger backend pentru a înregistra evenimentul
    await fetch('https://backend.jackpotx.net/api/v1/responsible-gaming/reality-checks/trigger', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });

    // Obține statistici session
    const statsResponse = await fetch('https://backend.jackpotx.net/api/v1/user/session-stats', {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    const stats = await statsResponse.json();

    // Afișează modal cu statistici
    alert(`Reality Check:\n\n` +
          `Timp jucat: ${stats.data.time_played} minute\n` +
          `Depozite totale: ${stats.data.total_deposits} USD\n` +
          `Retrageri totale: ${stats.data.total_withdrawals} USD\n` +
          `Profituri nete: ${stats.data.net_profit} USD\n\n` +
          `Dorești să continui să joci?`);

  } catch (error) {
    console.error('Error showing reality check:', error);
  }
};
```

---

## 4. Responsible Gaming - Integrare Admin

### 4.1 Dashboard Statistici Joc Responsabil

```javascript
// Admin Component - Responsible Gaming Stats
const ResponsibleGamingDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRGStats();
  }, []);

  const fetchRGStats = async () => {
    try {
      const response = await fetch('https://backend.jackpotx.net/api/v1/responsible-gaming/admin/stats', {
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching RG stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="rg-dashboard">
      <h1>Responsible Gaming Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Deposit Limits Active</h3>
          <p className="stat-value">{stats.deposit_limits.active}</p>
          <p className="stat-detail">Total: {stats.deposit_limits.total}</p>
        </div>

        <div className="stat-card">
          <h3>Self-Exclusions Active</h3>
          <p className="stat-value">{stats.self_exclusions.active}</p>
          <p className="stat-detail">Expired: {stats.self_exclusions.expired}</p>
        </div>

        <div className="stat-card">
          <h3>Reality Checks Enabled</h3>
          <p className="stat-value">{stats.reality_checks.enabled}</p>
          <p className="stat-detail">Total triggers: {stats.reality_checks.total_triggers}</p>
        </div>
      </div>
    </div>
  );
};
```

### 4.2 Gestionare Auto-Excluderi (Admin)

```javascript
// Admin: Listare toate auto-excluderile
const fetchAllSelfExclusions = async (status = 'ACTIVE') => {
  try {
    const response = await fetch(
      `https://backend.jackpotx.net/api/v1/responsible-gaming/admin/self-exclusions?status=${status}`,
      {
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      return data.data;
    }
  } catch (error) {
    console.error('Error fetching self-exclusions:', error);
    return [];
  }
};

// Admin: Aprobare cerere de încheiere anticipată
const approveEarlyTermination = async (exclusionId, approved = true, adminNotes = '') => {
  try {
    const response = await fetch(
      `https://backend.jackpotx.net/api/v1/responsible-gaming/admin/self-exclusions/${exclusionId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: approved ? 'COMPLETED' : 'ACTIVE',
          admin_notes: adminNotes
        })
      }
    );

    const data = await response.json();

    if (data.success) {
      alert(approved ? 'Cerere aprobată!' : 'Cerere respinsă!');
    } else {
      alert(`Eroare: ${data.message}`);
    }
  } catch (error) {
    console.error('Error updating self-exclusion:', error);
  }
};
```

---

## 5. Multilanguage System

### 5.1 Schimbare limbă în Frontend

```javascript
// Context pentru limbă
import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [currentLang, setCurrentLang] = useState('en');
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTranslations(currentLang);
  }, [currentLang]);

  const loadTranslations = async (lang) => {
    try {
      setLoading(true);
      const response = await fetch(`https://backend.jackpotx.net/api/v1/multilanguage/translations/${lang}`);
      const data = await response.json();

      if (data.success) {
        setTranslations(data.data);
      }
    } catch (error) {
      console.error('Error loading translations:', error);
    } finally {
      setLoading(false);
    }
  };

  const t = (key, defaultValue = key) => {
    return translations[key] || defaultValue;
  };

  const changeLanguage = (lang) => {
    setCurrentLang(lang);
    localStorage.setItem('preferredLanguage', lang);
  };

  return (
    <LanguageContext.Provider value={{ currentLang, changeLanguage, t, loading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
```

**Utilizare în componente**:

```javascript
import { useLanguage } from './LanguageContext';

const Header = () => {
  const { t, currentLang, changeLanguage } = useLanguage();

  return (
    <header>
      <h1>{t('common.welcome', 'Welcome to JackpotX')}</h1>
      <button onClick={() => changeLanguage('en')}>English</button>
      <button onClick={() => changeLanguage('ro')}>Română</button>
      <button onClick={() => changeLanguage('es')}>Español</button>
    </header>
  );
};
```

### 5.2 Admin: Gestionare Traduceri

```javascript
// Admin: Adăugare/Editare traducere
const saveTranslation = async (language, key, value, category = 'general') => {
  try {
    const response = await fetch(
      `https://backend.jackpotx.net/api/v1/multilanguage/translations/${language}/${key}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          value: value,
          category: category
        })
      }
    );

    const data = await response.json();

    if (data.success) {
      alert('Traducere salvată cu succes!');

      // Curăță cache-ul
      await clearTranslationCache();
    } else {
      alert(`Eroare: ${data.message}`);
    }
  } catch (error) {
    console.error('Error saving translation:', error);
  }
};

// Admin: Curăță cache traduceri
const clearTranslationCache = async () => {
  try {
    const response = await fetch(
      'https://backend.jackpotx.net/api/v1/multilanguage/translations/cache/clear',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('Translation cache cleared successfully');
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

// Admin: Import bulk traduceri (JSON)
const importTranslations = async (language, translationsObject) => {
  try {
    const response = await fetch(
      'https://backend.jackpotx.net/api/v1/multilanguage/translations/bulk',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          language: language,
          translations: translationsObject
        })
      }
    );

    const data = await response.json();

    if (data.success) {
      alert(`${data.data.imported} traduceri importate cu succes!`);
    } else {
      alert(`Eroare: ${data.message}`);
    }
  } catch (error) {
    console.error('Error importing translations:', error);
  }
};

// Exemplu import bulk
const exampleBulkImport = {
  "common.welcome": "Bine ai venit la JackpotX",
  "common.login": "Autentificare",
  "common.logout": "Deconectare",
  "games.slots": "Sloturi",
  "games.table": "Jocuri de masă"
};

importTranslations('ro', exampleBulkImport);
```

---

## 6. Metadata APIs

### 6.1 Afișare Currencies în Deposit/Withdrawal

```javascript
// Componenta Deposit - Selectare valută
const DepositForm = () => {
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      // Obține doar crypto currencies pentru OxaPay
      const response = await fetch('https://backend.jackpotx.net/api/v1/metadata/currencies/crypto');
      const data = await response.json();

      if (data.success) {
        setCurrencies(data.data);
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  return (
    <div className="deposit-form">
      <h2>Deposit Crypto</h2>

      <select
        value={selectedCurrency}
        onChange={(e) => setSelectedCurrency(e.target.value)}
      >
        {currencies.map(currency => (
          <option key={currency.code} value={currency.code}>
            {currency.name} ({currency.symbol}) - {currency.code}
          </option>
        ))}
      </select>

      <input type="number" placeholder="Amount" />
      <button>Deposit {selectedCurrency}</button>
    </div>
  );
};
```

### 6.2 Selector de Țară la Înregistrare

```javascript
// Componenta Registration - Country Select
const CountrySelect = ({ value, onChange }) => {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await fetch('https://backend.jackpotx.net/api/v1/metadata/countries');
      const data = await response.json();

      if (data.success) {
        setCountries(data.data);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading countries...</div>;

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select your country</option>
      {countries.map(country => (
        <option key={country.code} value={country.code}>
          {country.flag} {country.name}
        </option>
      ))}
    </select>
  );
};
```

### 6.3 Mobile Prefix Selector

```javascript
// Componenta Phone Input cu Auto-Prefix
const PhoneInput = () => {
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [prefixes, setPrefixes] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    fetchMobilePrefixes();
  }, []);

  const fetchMobilePrefixes = async () => {
    try {
      const response = await fetch('https://backend.jackpotx.net/api/v1/metadata/mobile-prefixes');
      const data = await response.json();

      if (data.success) {
        setPrefixes(data.data);
      }
    } catch (error) {
      console.error('Error fetching mobile prefixes:', error);
    }
  };

  const getCurrentPrefix = () => {
    const countryPrefix = prefixes.find(p => p.country_code === selectedCountry);
    return countryPrefix ? countryPrefix.prefix : '+1';
  };

  return (
    <div className="phone-input">
      <select
        value={selectedCountry}
        onChange={(e) => setSelectedCountry(e.target.value)}
      >
        {prefixes.map(prefix => (
          <option key={prefix.country_code} value={prefix.country_code}>
            {prefix.country_name} ({prefix.prefix})
          </option>
        ))}
      </select>

      <input
        type="tel"
        placeholder="Phone number"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />

      <p>Full number: {getCurrentPrefix()}{phoneNumber}</p>
    </div>
  );
};
```

---

## 7. CMS System

### 7.1 Frontend: Afișare Pagină CMS

```javascript
// Dynamic CMS Page Component
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

const CMSPage = () => {
  const { slug } = useParams(); // Ex: /terms-and-conditions
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPage(slug);
  }, [slug]);

  const fetchPage = async (slug) => {
    try {
      const response = await fetch(`https://backend.jackpotx.net/api/v1/cms/pages/${slug}`);
      const data = await response.json();

      if (data.success) {
        setPage(data.data);
      } else {
        // Pagină negăsită
        setPage(null);
      }
    } catch (error) {
      console.error('Error fetching CMS page:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!page) return <div>Page not found</div>;

  return (
    <div className={`cms-page template-${page.template}`}>
      <h1>{page.title}</h1>

      {page.featured_image && (
        <img src={page.featured_image} alt={page.title} />
      )}

      <div
        className="cms-content"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />

      <div className="cms-meta">
        <small>Last updated: {new Date(page.updated_at).toLocaleDateString()}</small>
      </div>
    </div>
  );
};

// Routing
// <Route path="/page/:slug" element={<CMSPage />} />
```

**Exemple sluguri disponibile**:
- `/page/terms-and-conditions`
- `/page/privacy-policy`
- `/page/responsible-gaming`
- `/page/about-us`
- `/page/faq`

### 7.2 Frontend: Afișare Bannere

```javascript
// Banner Display Component
const BannerDisplay = ({ position = 'homepage_hero' }) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanners(position);
  }, [position]);

  const fetchBanners = async (position) => {
    try {
      const response = await fetch(
        `https://backend.jackpotx.net/api/v1/cms/banners?position=${position}&limit=5`
      );
      const data = await response.json();

      if (data.success) {
        setBanners(data.data);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerClick = async (bannerId, targetUrl) => {
    try {
      // Track click
      await fetch(`https://backend.jackpotx.net/api/v1/cms/banners/${bannerId}/click`, {
        method: 'POST'
      });

      // Redirect
      if (targetUrl) {
        window.location.href = targetUrl;
      }
    } catch (error) {
      console.error('Error tracking banner click:', error);
    }
  };

  if (loading) return <div>Loading banners...</div>;
  if (banners.length === 0) return null;

  return (
    <div className={`banner-container position-${position}`}>
      {banners.map(banner => (
        <div
          key={banner.id}
          className="banner"
          onClick={() => handleBannerClick(banner.id, banner.target_url)}
          style={{ cursor: banner.target_url ? 'pointer' : 'default' }}
        >
          <img src={banner.image_url} alt={banner.title} />
          <div className="banner-content">
            <h3>{banner.title}</h3>
            <p>{banner.description}</p>
            {banner.button_text && (
              <button>{banner.button_text}</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Utilizare
<BannerDisplay position="homepage_hero" />
<BannerDisplay position="sidebar" />
```

### 7.3 Admin: Gestionare CMS Pages

```javascript
// Admin: Create/Update CMS Page
const CMSPageEditor = ({ pageId = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    meta_description: '',
    template: 'default',
    featured_image: '',
    status: 'draft',
    language: 'en'
  });

  useEffect(() => {
    if (pageId) {
      fetchPage(pageId);
    }
  }, [pageId]);

  const fetchPage = async (id) => {
    try {
      const response = await fetch(`https://backend.jackpotx.net/api/v1/cms/pages/${id}`, {
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setFormData(data.data);
      }
    } catch (error) {
      console.error('Error fetching page:', error);
    }
  };

  const savePage = async () => {
    try {
      const url = pageId
        ? `https://backend.jackpotx.net/api/v1/cms/pages/${pageId}`
        : 'https://backend.jackpotx.net/api/v1/cms/pages';

      const method = pageId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Pagină salvată cu succes!');
      } else {
        alert(`Eroare: ${data.message}`);
      }
    } catch (error) {
      console.error('Error saving page:', error);
    }
  };

  const publishPage = async () => {
    try {
      const response = await fetch(
        `https://backend.jackpotx.net/api/v1/cms/pages/${pageId}/publish`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAdminToken()}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        alert('Pagină publicată cu succes!');
        setFormData({ ...formData, status: 'published' });
      } else {
        alert(`Eroare: ${data.message}`);
      }
    } catch (error) {
      console.error('Error publishing page:', error);
    }
  };

  return (
    <div className="cms-editor">
      <h1>{pageId ? 'Edit Page' : 'Create New Page'}</h1>

      <input
        type="text"
        placeholder="Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      />

      <input
        type="text"
        placeholder="Slug (URL)"
        value={formData.slug}
        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
      />

      <textarea
        placeholder="Content (HTML supported)"
        value={formData.content}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
        rows={15}
      />

      <select
        value={formData.template}
        onChange={(e) => setFormData({ ...formData, template: e.target.value })}
      >
        <option value="default">Default</option>
        <option value="full_width">Full Width</option>
        <option value="sidebar_left">Sidebar Left</option>
        <option value="sidebar_right">Sidebar Right</option>
        <option value="landing_page">Landing Page</option>
      </select>

      <button onClick={savePage}>Save Draft</button>
      {pageId && formData.status === 'draft' && (
        <button onClick={publishPage}>Publish</button>
      )}
    </div>
  );
};
```

### 7.4 Admin: Gestionare Bannere

```javascript
// Admin: Create/Update Banner
const BannerEditor = ({ bannerId = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    target_url: '',
    button_text: '',
    position: 'homepage_hero',
    category: 'promotion',
    is_active: true,
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    priority: 0
  });

  const saveBanner = async () => {
    try {
      const url = bannerId
        ? `https://backend.jackpotx.net/api/v1/cms/banners/${bannerId}`
        : 'https://backend.jackpotx.net/api/v1/cms/banners';

      const method = bannerId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Banner salvat cu succes!');
      } else {
        alert(`Eroare: ${data.message}`);
      }
    } catch (error) {
      console.error('Error saving banner:', error);
    }
  };

  return (
    <div className="banner-editor">
      <h1>{bannerId ? 'Edit Banner' : 'Create New Banner'}</h1>

      <input
        type="text"
        placeholder="Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      />

      <input
        type="text"
        placeholder="Image URL"
        value={formData.image_url}
        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
      />

      <input
        type="text"
        placeholder="Target URL (optional)"
        value={formData.target_url}
        onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
      />

      <select
        value={formData.position}
        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
      >
        <option value="homepage_hero">Homepage Hero</option>
        <option value="homepage_middle">Homepage Middle</option>
        <option value="sidebar">Sidebar</option>
        <option value="footer">Footer</option>
        <option value="modal">Modal</option>
        <option value="games_page">Games Page</option>
        <option value="promotions_page">Promotions Page</option>
      </select>

      <input
        type="date"
        placeholder="Start Date"
        value={formData.start_date}
        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
      />

      <input
        type="date"
        placeholder="End Date (optional)"
        value={formData.end_date || ''}
        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
      />

      <button onClick={saveBanner}>Save Banner</button>
    </div>
  );
};
```

---

## 8. IP Tracking & Security

### 8.1 Frontend: Trimitere IP Public

```javascript
// Get user's public IP and send it with requests
const getUserPublicIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting public IP:', error);
    return null;
  }
};

// Axios interceptor pentru a adăuga IP-ul la toate request-urile
import axios from 'axios';

const setupAxiosInterceptor = async () => {
  const publicIP = await getUserPublicIP();

  axios.interceptors.request.use(
    (config) => {
      if (publicIP) {
        config.headers['X-Public-IP'] = publicIP;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
};

// Call la inițializare app
setupAxiosInterceptor();
```

### 8.2 Admin: View IP Tracking Logs

```javascript
// Admin: IP Tracking Logs Viewer
const IPTrackingLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    userId: null,
    action: null,
    startDate: null,
    endDate: null,
    limit: 50,
    offset: 0
  });

  const fetchLogs = async () => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(
        `https://backend.jackpotx.net/api/v1/admin/ip-tracking/logs?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${getAdminToken()}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching IP logs:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  return (
    <div className="ip-tracking-logs">
      <h1>IP Tracking Logs</h1>

      <div className="filters">
        <input
          type="number"
          placeholder="User ID"
          onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
        />
        <input
          type="text"
          placeholder="Action"
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
        />
        <button onClick={fetchLogs}>Filter</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>User ID</th>
            <th>IP Address</th>
            <th>Action</th>
            <th>User Agent</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{log.id}</td>
              <td>{log.user_id || 'N/A'}</td>
              <td>{log.ip_address}</td>
              <td>{log.action}</td>
              <td>{log.user_agent?.substring(0, 50)}...</td>
              <td>{new Date(log.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### 8.3 Admin: Activități Suspecte

```javascript
// Admin: View suspicious activities
const SuspiciousActivities = () => {
  const [activities, setActivities] = useState([]);

  const fetchSuspiciousActivities = async () => {
    try {
      const response = await fetch(
        'https://backend.jackpotx.net/api/v1/admin/ip-tracking/suspicious',
        {
          headers: {
            'Authorization': `Bearer ${getAdminToken()}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setActivities(data.data);
      }
    } catch (error) {
      console.error('Error fetching suspicious activities:', error);
    }
  };

  useEffect(() => {
    fetchSuspiciousActivities();
  }, []);

  return (
    <div className="suspicious-activities">
      <h1>🚨 Suspicious Activities</h1>

      <ul>
        {activities.map(activity => (
          <li key={activity.id} className="alert">
            <strong>User ID: {activity.user_id}</strong>
            <p>IP: {activity.ip_address}</p>
            <p>Action: {activity.action}</p>
            <p>Reason: {activity.reason}</p>
            <p>Time: {new Date(activity.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

---

## 9. Exemple de Cod

### 9.1 Utility Functions

```javascript
// utils/api.js - Helper functions pentru API calls

const BASE_URL = 'https://backend.jackpotx.net/api/v1';

export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

export const getAdminToken = () => {
  return localStorage.getItem('adminToken');
};

export const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();

  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Exemple utilizare
export const ResponsibleGamingAPI = {
  getDepositLimits: () => apiCall('/responsible-gaming/deposit-limits'),

  setDepositLimit: (periodType, amount, currency) =>
    apiCall('/responsible-gaming/deposit-limits', {
      method: 'POST',
      body: JSON.stringify({ period_type: periodType, amount_limit: amount, currency })
    }),

  checkDepositLimit: (amount) =>
    apiCall(`/responsible-gaming/deposit-limits/check?amount=${amount}`),

  activateSelfExclusion: (days, reason) =>
    apiCall('/responsible-gaming/self-exclusions', {
      method: 'POST',
      body: JSON.stringify({ duration_days: days, reason })
    })
};

export const MetadataAPI = {
  getCurrencies: (type = null) => {
    const endpoint = type ? `/metadata/currencies/${type}` : '/metadata/currencies';
    return apiCall(endpoint);
  },

  getCountries: () => apiCall('/metadata/countries'),

  getMobilePrefixes: () => apiCall('/metadata/mobile-prefixes')
};

export const CMSAPI = {
  getPage: (slug) => apiCall(`/cms/pages/${slug}`),

  getBanners: (position, limit = 5) =>
    apiCall(`/cms/banners?position=${position}&limit=${limit}`),

  trackBannerClick: (bannerId) =>
    apiCall(`/cms/banners/${bannerId}/click`, { method: 'POST' })
};
```

### 9.2 React Hooks Custom

```javascript
// hooks/useResponsibleGaming.js
import { useState, useEffect } from 'react';
import { ResponsibleGamingAPI } from '../utils/api';

export const useDepositLimits = () => {
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLimits = async () => {
    try {
      setLoading(true);
      const data = await ResponsibleGamingAPI.getDepositLimits();
      setLimits(data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, []);

  const setLimit = async (periodType, amount, currency) => {
    try {
      await ResponsibleGamingAPI.setDepositLimit(periodType, amount, currency);
      await fetchLimits(); // Refresh
    } catch (err) {
      throw err;
    }
  };

  const checkLimit = async (amount) => {
    try {
      const data = await ResponsibleGamingAPI.checkDepositLimit(amount);
      return data.data;
    } catch (err) {
      throw err;
    }
  };

  return { limits, loading, error, setLimit, checkLimit, refetch: fetchLimits };
};

// hooks/useMetadata.js
export const useCurrencies = (type = null) => {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const data = await MetadataAPI.getCurrencies(type);
        setCurrencies(data.data);
      } catch (error) {
        console.error('Error fetching currencies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrencies();
  }, [type]);

  return { currencies, loading };
};

// hooks/useCMS.js
export const useCMSPage = (slug) => {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const data = await CMSAPI.getPage(slug);
        setPage(data.data);
        setNotFound(false);
      } catch (error) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  return { page, loading, notFound };
};
```

---

## 10. Structura Tabelelor

### 10.1 Responsible Gaming Tables

#### **deposit_limits**
```sql
Columns:
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER) - Foreign Key -> users.id
- period_type (VARCHAR) - 'daily', 'weekly', 'monthly'
- amount_limit (DECIMAL) - Limita maximă
- amount_used (DECIMAL) - Suma folosită în perioadă
- currency (VARCHAR) - 'USD', 'EUR', etc.
- start_date (TIMESTAMP)
- end_date (TIMESTAMP)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **self_exclusions**
```sql
Columns:
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER) - Foreign Key -> users.id
- duration_days (INTEGER) - NULL pentru permanent
- start_date (TIMESTAMP)
- expires_at (TIMESTAMP)
- reason (TEXT)
- status (VARCHAR) - 'ACTIVE', 'EXPIRED', 'COMPLETED', 'CANCELLED'
- created_at (TIMESTAMP)
- ended_at (TIMESTAMP)
- admin_notes (TEXT)
```

#### **reality_checks**
```sql
Columns:
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER) - Foreign Key -> users.id
- interval_minutes (INTEGER) - 15, 30, 60, 120
- is_enabled (BOOLEAN)
- last_trigger_at (TIMESTAMP)
- trigger_count (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 10.2 Multilanguage Tables

#### **languages**
```sql
Columns:
- id (SERIAL PRIMARY KEY)
- code (VARCHAR) - 'en', 'ro', 'es', etc.
- name (VARCHAR) - 'English', 'Română'
- native_name (VARCHAR) - 'English', 'Română'
- is_active (BOOLEAN)
- is_default (BOOLEAN)
- flag_emoji (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **translations**
```sql
Columns:
- id (SERIAL PRIMARY KEY)
- language_code (VARCHAR) - Foreign Key -> languages.code
- key (VARCHAR) - 'common.welcome', 'games.slots'
- value (TEXT) - Traducerea efectivă
- category (VARCHAR) - 'common', 'games', 'errors'
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- UNIQUE (language_code, key)
```

### 10.3 Metadata Tables

#### **currencies**
```sql
Columns:
- id (SERIAL PRIMARY KEY)
- code (VARCHAR) - 'USD', 'BTC', 'ETH'
- name (VARCHAR) - 'US Dollar', 'Bitcoin'
- symbol (VARCHAR) - '$', '₿'
- type (VARCHAR) - 'FIAT', 'CRYPTO'
- country (VARCHAR) - 'United States', 'Blockchain'
- decimal_places (INTEGER) - 2 pentru FIAT, 8 pentru CRYPTO
- exchange_rate_to_usd (DECIMAL)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **countries**
```sql
Columns:
- id (SERIAL PRIMARY KEY)
- code (VARCHAR) - 'US', 'RO'
- code3 (VARCHAR) - 'USA', 'ROU'
- name (VARCHAR) - 'United States'
- native_name (VARCHAR) - 'United States'
- phone_code (VARCHAR) - '+1', '+40'
- currency_code (VARCHAR) - Foreign Key -> currencies.code
- continent (VARCHAR) - 'North America', 'Europe'
- region (VARCHAR) - 'Northern America', 'Eastern Europe'
- flag (VARCHAR) - '🇺🇸', '🇷🇴'
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **mobile_prefixes**
```sql
Columns:
- id (SERIAL PRIMARY KEY)
- country_code (VARCHAR) - Foreign Key -> countries.code
- prefix (VARCHAR) - '+1', '+40'
- country_name (VARCHAR)
- carrier (VARCHAR) - 'Various', 'Vodafone'
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 10.4 CMS Tables

#### **cms_pages**
```sql
Columns:
- id (SERIAL PRIMARY KEY)
- title (VARCHAR)
- slug (VARCHAR) - UNIQUE 'terms-and-conditions'
- content (TEXT) - HTML content
- excerpt (TEXT)
- meta_description (TEXT)
- template (VARCHAR) - 'default', 'full_width'
- featured_image (TEXT) - URL
- status (VARCHAR) - 'draft', 'published', 'archived'
- language (VARCHAR) - Foreign Key -> languages.code
- published_at (TIMESTAMP)
- created_by (INTEGER) - Foreign Key -> backoffice_users.id
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **cms_banners**
```sql
Columns:
- id (SERIAL PRIMARY KEY)
- title (VARCHAR)
- description (TEXT)
- image_url (TEXT)
- target_url (TEXT)
- button_text (VARCHAR)
- position (VARCHAR) - 'homepage_hero', 'sidebar'
- category (VARCHAR) - 'promotion', 'announcement'
- is_active (BOOLEAN)
- start_date (TIMESTAMP)
- end_date (TIMESTAMP)
- priority (INTEGER) - Order/weight
- click_count (INTEGER)
- created_by (INTEGER) - Foreign Key -> backoffice_users.id
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 10.5 IP Tracking Table

#### **ip_tracking_logs**
```sql
Columns:
- id (BIGSERIAL PRIMARY KEY)
- user_id (INTEGER) - Foreign Key -> users.id (nullable)
- session_id (VARCHAR)
- ip_address (VARCHAR)
- action (VARCHAR) - 'login', 'deposit', 'withdrawal'
- user_agent (TEXT)
- metadata (JSONB) - Additional data
- created_at (TIMESTAMP)

Indexes:
- user_id
- ip_address
- action
- created_at
```

---

## 11. Environment Variables Necesare

Backend-ul necesită următoarele variabile de mediu (`.env`):

```bash
# Server
PORT=3001
NODE_ENV=production

# Database PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=12358Voot#
DB_NAME=jackpotx-db

# MongoDB
MONGO_URI=mongodb://localhost:27017/jackpotx

# JWT
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_ACCESS_TOKEN_EXPIRES=24h
JWT_REFRESH_TOKEN_EXPIRES=30d

# Swagger
SWAGGER_PASSWORD=admin123

# Supplier/Provider
SUPPLIER_API_KEY=your_supplier_api_key
SUPPLIER_SECRET_KEY=your_supplier_secret_key
SUPPLIER_GAME_LIST_URL=https://...
SUPPLIER_LAUNCH_HOST=https://...
SUPPLIER_CALLBACK_URL=https://backend.jackpotx.net/api/v1/callback
SUPPLIER_OPERATOR_ID=your_operator_id
OPERATOR_HOME_URL=https://jackpotx.net
GGR_FILTER_PERCENT=0.5
GGR_TOLERANCE=0.05
PROVIDER_GGR_ENDPOINT=https://...
PROVIDER_API_KEY=your_provider_api_key

# Rate Limiting (setate la 999999 pentru development)
RATE_LIMIT_STANDARD_MAX=999999
RATE_LIMIT_STANDARD_WINDOW_MS=900000
RATE_LIMIT_STRICT_MAX=999999
RATE_LIMIT_STRICT_WINDOW_MS=60000
RATE_LIMIT_PROVIDER_MAX=999999
RATE_LIMIT_PROVIDER_WINDOW_MS=60000
RATE_LIMIT_AUTH_MAX=999999
RATE_LIMIT_AUTH_WINDOW_MS=900000
```

---

## 12. Testare API cu Postman/Insomnia

### Import Postman Collection

Poți crea o colecție Postman cu toate endpoint-urile:

```json
{
  "info": {
    "name": "JackpotX Enterprise APIs",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Responsible Gaming",
      "item": [
        {
          "name": "Get Deposit Limits",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{authToken}}"
              }
            ],
            "url": "{{baseUrl}}/api/v1/responsible-gaming/deposit-limits"
          }
        },
        {
          "name": "Set Deposit Limit",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{authToken}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"period_type\": \"daily\",\n  \"amount_limit\": 100,\n  \"currency\": \"USD\"\n}"
            },
            "url": "{{baseUrl}}/api/v1/responsible-gaming/deposit-limits"
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://backend.jackpotx.net"
    },
    {
      "key": "authToken",
      "value": "your_jwt_token_here"
    }
  ]
}
```

---

## 13. Checklist Integrare

### Frontend Developer Checklist

- [ ] **Responsible Gaming**
  - [ ] Pagină setări Deposit Limits
  - [ ] Modal Self-Exclusion
  - [ ] Reality Check popup/timer
  - [ ] Verificare limite înainte de deposit

- [ ] **Multilanguage**
  - [ ] Context/Provider pentru limbă
  - [ ] Selector de limbă în header/footer
  - [ ] Traduceri pentru toate textele
  - [ ] Persistență limbă (localStorage)

- [ ] **Metadata**
  - [ ] Selector valute în deposit/withdrawal
  - [ ] Selector țară la înregistrare
  - [ ] Phone input cu prefix automat

- [ ] **CMS**
  - [ ] Routing pentru pagini CMS dinamice
  - [ ] Componente pentru bannere (diverse poziții)
  - [ ] Footer links către pagini CMS (T&C, Privacy)

- [ ] **IP Tracking**
  - [ ] Obținere IP public la load app
  - [ ] Trimitere X-Public-IP header în toate request-urile

### Admin Developer Checklist

- [ ] **Responsible Gaming Admin**
  - [ ] Dashboard cu statistici RG
  - [ ] Lista deposit limits (toate users)
  - [ ] Gestionare self-exclusions (aprobare early termination)
  - [ ] Monitorizare reality checks

- [ ] **Multilanguage Admin**
  - [ ] Editor traduceri (key-value)
  - [ ] Import/Export bulk traduceri (JSON)
  - [ ] Adăugare limbi noi
  - [ ] Curățare cache traduceri

- [ ] **Metadata Admin**
  - [ ] Gestionare currencies (add/edit)
  - [ ] Actualizare exchange rates
  - [ ] Gestionare țări
  - [ ] Gestionare prefixe telefonice

- [ ] **CMS Admin**
  - [ ] CRUD pagini CMS (editor WYSIWYG opțional)
  - [ ] Publish/Unpublish pagini
  - [ ] CRUD bannere
  - [ ] Monitorizare click-uri bannere
  - [ ] Preview pagini draft

- [ ] **IP Tracking Admin**
  - [ ] View toate log-urile IP
  - [ ] Filtrare după user/action/date
  - [ ] Dashboard activități suspecte
  - [ ] Export logs (CSV/JSON)

---

## 14. Contact & Support

Pentru întrebări sau probleme de integrare:

- **Backend Developer**: Contactează echipa backend
- **API Documentation**: Swagger disponibil la `https://backend.jackpotx.net/api-docs`
- **Database Schema**: Vezi migrațiile din `/src/db/migrations/`
- **Exemple avansate**: Vezi fișierul `INTEGRATION_GUIDE.md` în repo

---

## 15. Changelog

**v1.0.0 - 2025-01-13**
- ✅ Implementare completă Responsible Gaming (Deposit Limits, Self-Exclusion, Reality Checks)
- ✅ Sistem Multilanguage (10 limbi, cache, bulk import)
- ✅ Metadata APIs (Currencies, Countries, Mobile Prefixes)
- ✅ CMS System (Pages, Banners, Templates)
- ✅ IP Tracking & Security
- ✅ 8 Cron Jobs pentru mentenanță automată
- ✅ 33 Currencies (15 FIAT + 18 OxaPay Crypto)
- ✅ 150+ țări pre-configurate
- ✅ Documentație completă pentru dezvoltatori

---

**🎉 Success! Backend-ul JackpotX este gata pentru integrare în Frontend și Admin Panel!**
