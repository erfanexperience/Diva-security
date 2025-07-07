import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import logo from './Assests/logo.png';

interface ParsedData {
  [key: string]: string;
}

const NAV_OPTIONS = [
  { key: 'scan', label: 'ID Scanning' },
  { key: 'history', label: 'History' },
];

const INFO_FIELDS = [
  { group: 'Personal Information', fields: [
    { label: 'Full Name', key: 'Full Name' },
    { label: 'Date of Birth', key: 'Date of Birth' },
    { label: 'Gender', key: 'Gender' },
    { label: 'Height', key: 'Height' },
    { label: 'Weight', key: 'Weight' },
    { label: 'Eye Color', key: 'Eye Color' },
    { label: 'Hair Color', key: 'Hair Color' },
  ]},
  { group: 'Address Information', fields: [
    { label: 'Street Address', key: 'Street Address' },
    { label: 'City', key: 'City' },
    { label: 'State', key: 'State' },
    { label: 'ZIP Code', key: 'ZIP Code' },
  ]},
  { group: 'Document Information', fields: [
    { label: 'Document Number', key: 'Document Number' },
    { label: 'Issue Date', key: 'Issue Date' },
    { label: 'Expiration Date', key: 'Expiration Date' },
    { label: 'License Class', key: 'License Class' },
    { label: 'Restrictions', key: 'Restriction Codes' },
    { label: 'Endorsements', key: 'Endorsement Codes' },
    { label: 'Country', key: 'Country' },
  ]},
];

const PASSWORD = 'mayaeva3911';

const App: React.FC = () => {
  const [barcodeText, setBarcodeText] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedData>({});
  const [nav, setNav] = useState('scan');
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authenticated && passwordRef.current) {
      passwordRef.current.focus();
    }
    if (authenticated && inputRef.current) {
      inputRef.current.focus();
    }
  }, [authenticated]);

  const parseBarcode = (text: string): ParsedData => {
    const data: ParsedData = {};
    const fieldMappings: { [key: string]: string } = {
      'DCS': 'Last Name',
      'DAC': 'First Name',
      'DAD': 'Middle Name',
      'DDE': 'Name Suffix',
      'DDF': 'Name Prefix',
      'DAA': 'Full Name',
      'DAQ': 'Document Number',
      'DLDAQ': 'Document Number',
      'IDDAQ': 'Document Number',
      'DBA': 'Expiration Date',
      'DBD': 'Issue Date',
      'DBB': 'Date of Birth',
      'DCF': 'Unique Document Identifier',
      'DDB': 'Document Issue Timestamp',
      'DDA': 'Compliance Type',
      'DDC': 'Issue Type',
      'DAG': 'Street Address',
      'DAI': 'City',
      'DAJ': 'State',
      'DAK': 'ZIP Code',
      'DBC': 'Gender',
      'DAU': 'Height',
      'DAY': 'Eye Color',
      'DAZ': 'Hair Color',
      'DCA': 'License Class',
      'DCB': 'Restriction Codes',
      'DCD': 'Endorsement Codes',
      'DCG': 'Country',
      'DCK': 'Inventory Control Number',
      'DDAN': 'Optional Tracking Field',
      'ZCA': 'Jurisdiction-Specific Field A',
      'ZCB': 'Jurisdiction-Specific Field B',
      'ZCC': 'Jurisdiction-Specific Field C',
      'ZCD': 'Jurisdiction-Specific Field D',
      'DAW': 'Weight',
    };

    // Find all code positions
    const codes = Object.keys(fieldMappings).sort((a, b) => b.length - a.length);
    const codeRegex = new RegExp(codes.join('|'), 'g');
    let match;
    const positions: { code: string; index: number }[] = [];
    while ((match = codeRegex.exec(text)) !== null) {
      positions.push({ code: match[0], index: match.index });
    }
    // Extract values between codes
    for (let i = 0; i < positions.length; i++) {
      const { code, index } = positions[i];
      const valueStart = index + code.length;
      const valueEnd = i + 1 < positions.length ? positions[i + 1].index : text.length;
      let value = text.substring(valueStart, valueEnd).trim();
      // Remove any leading/trailing non-printable characters
      value = value.replace(/^[^\x20-\x7E]+|[^\x20-\x7E]+$/g, '');
      if (value) {
        data[fieldMappings[code]] = value;
      }
    }
    return data;
  };

  // Helper to capitalize each word in a name
  const capitalizeName = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

  // Eye color code mapping
  const eyeColorMap: { [key: string]: string } = {
    BLK: 'Black', BLU: 'Blue', BRO: 'Brown', GRY: 'Gray', GRN: 'Green', HAZ: 'Hazel', MAR: 'Maroon', PNK: 'Pink', DIC: 'Dichromatic', UNK: 'Unknown'
  };
  // Hair color code mapping
  const hairColorMap: { [key: string]: string } = {
    BAL: 'Bald', BLK: 'Black', BLN: 'Blonde', BRO: 'Brown', GRY: 'Gray', RED: 'Red/Auburn', SDY: 'Sandy', WHI: 'White', UNK: 'Unknown'
  };

  // Full Name logic
  const getFullName = () => {
    if (parsedData['Full Name']) return capitalizeName(parsedData['Full Name']);
    const nameParts = [];
    if (isValidNamePart(parsedData['Name Prefix'])) nameParts.push(parsedData['Name Prefix']);
    if (isValidNamePart(parsedData['First Name'])) nameParts.push(parsedData['First Name']);
    if (isValidNamePart(parsedData['Middle Name'])) nameParts.push(parsedData['Middle Name']);
    if (isValidNamePart(parsedData['Last Name'])) nameParts.push(parsedData['Last Name']);
    if (isValidNamePart(parsedData['Name Suffix'])) nameParts.push(parsedData['Name Suffix']);
    return nameParts.length > 0 ? capitalizeName(nameParts.join(' ')) : 'N/A';
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setBarcodeText(text);
    if (text.trim()) {
      const parsed = parseBarcode(text);
      setParsedData(parsed);
    } else {
      setParsedData({});
    }
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr === 'NONE') return 'N/A';
    
    // Handle MM/DD/YYYY format
    if (dateStr.includes('/')) {
      return dateStr;
    }
    
    // Handle MMDDYYYY format
    if (dateStr.length === 8) {
      const month = dateStr.substring(0, 2);
      const day = dateStr.substring(2, 4);
      const year = dateStr.substring(4, 8);
      return `${month}/${day}/${year}`;
    }
    
    return dateStr;
  };

  const formatGender = (gender: string): string => {
    if (!gender || gender === 'NONE') return 'N/A';
    return gender === '1' ? 'Male' : gender === '2' ? 'Female' : gender;
  };

  // Helper to check if a name part is valid
  const isValidNamePart = (part: string) => {
    if (!part) return false;
    const invalids = ['NONE', 'NONEDDGN', 'N', 'NONED', 'NONEDD', 'NONEDDGN', 'NONEDGN'];
    return !invalids.includes(part.trim().toUpperCase());
  };

  // Helper to format ZIP code
  const formatZip = (zip: string | undefined) => {
    if (!zip) return 'N/A';
    // Remove non-digit characters
    const digits = zip.replace(/\D/g, '');
    if (digits.length >= 5) {
      // If 9 digits, show as ZIP+4, else just 5 digits
      if (digits.length === 9) {
        return digits.substring(0, 5) + '-' + digits.substring(5, 9).replace(/0+$/, '');
      }
      // Remove trailing zeros for 5-digit zip
      return digits.substring(0, 5).replace(/0+$/, '');
    }
    return digits || 'N/A';
  };

  // Helper to format height
  const formatHeight = (height: string | undefined) => {
    if (!height) return 'N/A';
    // Extract number of inches
    const match = height.match(/(\d{2,3})/);
    if (!match) return height;
    const inches = parseInt(match[1], 10);
    if (isNaN(inches) || inches < 36 || inches > 96) return height; // plausible range
    const feet = Math.floor(inches / 12);
    const remInches = inches % 12;
    const cm = Math.round(inches * 2.54);
    return `${feet}'${remInches}" (${cm} cm)`;
  };

  // Helper to calculate age from date string
  const getAge = (dob: string | undefined) => {
    if (!dob) return '';
    // Try to parse MM/DD/YYYY or MMDDYYYY
    let parts;
    if (dob.includes('/')) {
      parts = dob.split('/');
      if (parts.length !== 3) return '';
      const [month, day, year] = parts;
      const birthDate = new Date(`${year}-${month}-${day}`);
      if (isNaN(birthDate.getTime())) return '';
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age.toString();
    } else if (dob.length === 8) {
      const month = dob.substring(0, 2);
      const day = dob.substring(2, 4);
      const year = dob.substring(4, 8);
      const birthDate = new Date(`${year}-${month}-${day}`);
      if (isNaN(birthDate.getTime())) return '';
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age.toString();
    }
    return '';
  };

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === PASSWORD) {
      setAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Incorrect password.');
    }
  };

  if (!authenticated) {
    return (
      <div className="LoginScreen">
        <form className="LoginForm" onSubmit={handleLogin}>
          <img src={logo} alt="Logo" className="login-logo" />
          <h2>Login</h2>
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            ref={passwordRef}
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            className="login-input"
            autoComplete="current-password"
          />
          {loginError && <div className="login-error">{loginError}</div>}
          <button type="submit" className="login-btn">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="AppLayout">
      <nav className="NavMenu">
        <div className="NavLogo"><img src={logo} alt="Logo" /></div>
        <ul className="NavOptions">
          {NAV_OPTIONS.map(opt => (
            <li key={opt.key} className={nav === opt.key ? 'active' : ''} onClick={() => setNav(opt.key)}>{opt.label}</li>
          ))}
        </ul>
      </nav>
      <main className="MainContent">
        {nav === 'scan' && (
          <div className="ScanContainer">
            <div className="input-section">
              <label htmlFor="barcode-input" className="input-label">Barcode Text:</label>
              <textarea
                id="barcode-input"
                ref={inputRef}
                value={barcodeText}
                onChange={handleTextChange}
                placeholder="Paste your barcode text here..."
                className="barcode-input"
                rows={4}
              />
            </div>
            <div className="results-section">
              <div className="results-grid">
                <div className="result-group" key={INFO_FIELDS[0].group}>
                  {/* Title with Full Name and Age - always visible */}
                  <div className="person-title">
                    <span className="person-name">{getFullName() !== 'N/A' ? getFullName() : 'Customer Name'}</span>
                    <span className="person-age">Age: {getAge(parsedData['Date of Birth']) || 'N/A'}</span>
                  </div>
                  <h3>{INFO_FIELDS[0].group}</h3>
                  {INFO_FIELDS[0].fields.map(field => (
                    <div className="result-item" key={field.key}>
                      <span className="label">{field.label}:</span>
                      <span className="value">
                        {field.key === 'Full Name' ? getFullName() !== 'N/A' ? getFullName() : '' :
                         field.key === 'Height' ? (parsedData['Height'] ? formatHeight(parsedData['Height']) : '') :
                         field.key === 'ZIP Code' ? (parsedData['ZIP Code'] ? formatZip(parsedData['ZIP Code']) : '') :
                         field.key === 'Gender' ? (parsedData['Gender'] ? formatGender(parsedData['Gender']) : '') :
                         field.key === 'Date of Birth' ? (parsedData['Date of Birth'] ? formatDate(parsedData['Date of Birth']) : '') :
                         field.key === 'Issue Date' ? (parsedData['Issue Date'] ? formatDate(parsedData['Issue Date']) : '') :
                         field.key === 'Expiration Date' ? (parsedData['Expiration Date'] ? formatDate(parsedData['Expiration Date']) : '') :
                         field.key === 'Eye Color' ? (parsedData['Eye Color'] ? (eyeColorMap[parsedData['Eye Color'].toUpperCase()] || parsedData['Eye Color']) : '') :
                         field.key === 'Hair Color' ? (parsedData['Hair Color'] ? (hairColorMap[parsedData['Hair Color'].toUpperCase()] || parsedData['Hair Color']) : '') :
                         parsedData[field.key] || ''}
                      </span>
                    </div>
                  ))}
                </div>
                {INFO_FIELDS.slice(1).map(group => (
                  <div className="result-group" key={group.group}>
                    <h3>{group.group}</h3>
                    {group.fields.map(field => (
                      <div className="result-item" key={field.key}>
                        <span className="label">{field.label}:</span>
                        <span className="value">
                          {field.key === 'Full Name' ? getFullName() !== 'N/A' ? getFullName() : '' :
                           field.key === 'Height' ? (parsedData['Height'] ? formatHeight(parsedData['Height']) : '') :
                           field.key === 'ZIP Code' ? (parsedData['ZIP Code'] ? formatZip(parsedData['ZIP Code']) : '') :
                           field.key === 'Gender' ? (parsedData['Gender'] ? formatGender(parsedData['Gender']) : '') :
                           field.key === 'Date of Birth' ? (parsedData['Date of Birth'] ? formatDate(parsedData['Date of Birth']) : '') :
                           field.key === 'Issue Date' ? (parsedData['Issue Date'] ? formatDate(parsedData['Issue Date']) : '') :
                           field.key === 'Expiration Date' ? (parsedData['Expiration Date'] ? formatDate(parsedData['Expiration Date']) : '') :
                           field.key === 'Eye Color' ? (parsedData['Eye Color'] ? (eyeColorMap[parsedData['Eye Color'].toUpperCase()] || parsedData['Eye Color']) : '') :
                           field.key === 'Hair Color' ? (parsedData['Hair Color'] ? (hairColorMap[parsedData['Hair Color'].toUpperCase()] || parsedData['Hair Color']) : '') :
                           parsedData[field.key] || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {nav === 'history' && (
          <div className="HistoryContainer">
            <h2>History</h2>
            <p>Coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
