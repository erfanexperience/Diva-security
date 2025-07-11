import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import logo from './Assests/logo.png';
import axios from 'axios';

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
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

const App: React.FC = () => {
  const [barcodeText, setBarcodeText] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedData>({});
  const [nav, setNav] = useState('scan');
  const [history, setHistory] = useState<any[]>([]);
  const [historySort, setHistorySort] = useState<'asc' | 'desc'>('desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  
  // Add debounce refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');

  // Focus management - keep input focused always
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && nav === 'scan') {
        inputRef.current.focus();
      }
    };

    // Focus on mount and when switching to scan tab
    focusInput();

    // Focus on any click/touch anywhere on the page
    const handleClick = () => {
      setTimeout(focusInput, 0);
    };

    // Focus on window focus (when switching back to tab)
    const handleWindowFocus = () => {
      setTimeout(focusInput, 0);
    };

    // Focus on visibility change (when switching tabs on mobile/tablet)
    const handleVisibilityChange = () => {
      if (!document.hidden && nav === 'scan') {
        setTimeout(focusInput, 100);
      }
    };

    // Focus on touch events (for tablets)
    const handleTouchStart = () => {
      if (nav === 'scan') {
        setTimeout(focusInput, 50);
      }
    };

    document.addEventListener('click', handleClick);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('touchstart', handleTouchStart);

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [nav]);

  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Helper to check if a name part is valid (add more as needed)
  const isValidNamePart = (part: string) => {
    if (!part) return false;
    const invalids = [
      'NONE', 'NONED', 'NONEDD', 'NONEDDGN', 'NONEDGN', 'U', 'UDDGU', 'N', 'UN', 'UNKNWN', 'UNKNOWN'
    ];
    return !invalids.includes(part.trim().toUpperCase());
  };

  // Improved Full Name logic
  const getFullName = () => {
    // Prefer DAA (Full Name) if present and valid
    if (parsedData['Full Name'] && isValidNamePart(parsedData['Full Name'])) {
      return capitalizeName(parsedData['Full Name']);
    }
    // Otherwise, use only valid First and Last Name
    const first = isValidNamePart(parsedData['First Name']) ? parsedData['First Name'] : '';
    const last = isValidNamePart(parsedData['Last Name']) ? parsedData['Last Name'] : '';
    if (first && last) return capitalizeName(`${first} ${last}`);
    if (first) return capitalizeName(first);
    if (last) return capitalizeName(last);
    // Optionally, include valid prefix/suffix/middle if you want, but only if they're not junk
    return '';
  };

  // Helper to get full name from a scan row
  const getRowFullName = (row: any) => {
    if (!row || !row.data) return '';
    // Use the same logic as getFullName but for row.data
    if (row.data['Full Name'] && isValidNamePart(row.data['Full Name'])) {
      return capitalizeName(row.data['Full Name']);
    }
    const first = isValidNamePart(row.data['First Name']) ? row.data['First Name'] : '';
    const last = isValidNamePart(row.data['Last Name']) ? row.data['Last Name'] : '';
    if (first && last) return capitalizeName(`${first} ${last}`);
    if (first) return capitalizeName(first);
    if (last) return capitalizeName(last);
    return '';
  };

  // Check if the parsed data represents a complete/valid scan
  const isCompleteScan = useCallback((data: ParsedData): boolean => {
    // Must have at least a document number and some personal info
    const hasDocumentNumber = Boolean(data['Document Number'] && data['Document Number'].trim().length > 0);
    const hasPersonalInfo = Boolean(
      (data['Full Name'] && data['Full Name'].trim().length > 0) ||
      (data['First Name'] && data['First Name'].trim().length > 0) ||
      (data['Last Name'] && data['Last Name'].trim().length > 0)
    );
    
    return hasDocumentNumber && hasPersonalInfo;
  }, []);

  // Create a stable hash of the parsed data to detect changes
  const getDataHash = useCallback((data: ParsedData): string => {
    const sortedKeys = Object.keys(data).sort();
    return sortedKeys.map(key => `${key}:${data[key]}`).join('|');
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setBarcodeText(text);
    
    if (text.trim()) {
      // Clear previous scan data first
      setParsedData({});
      
      // Small delay to show the clearing effect, then parse new data
      setTimeout(() => {
        const parsed = parseBarcode(text);
        setParsedData(parsed);
      }, 100);
    } else {
      setParsedData({});
    }
  };

  // Fetch history from backend
  const fetchHistory = async (sort: 'asc' | 'desc' = 'desc') => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/history?sort=${sort}`);
      setHistory(res.data);
    } catch (err) {
      setHistory([]);
    }
  };

  // Save scan to backend
  const saveScan = useCallback(async (data: any) => {
    try {
      await axios.post(`${BACKEND_URL}/api/history`, { data });
      fetchHistory(historySort);
    } catch (err) {
      // handle error
    }
  }, [historySort]);

  // Debounced save function
  const debouncedSave = useCallback((data: ParsedData) => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Create a hash of the current data
    const dataHash = getDataHash(data);
    
    // Only save if this is a complete scan and the data has actually changed
    if (isCompleteScan(data) && dataHash !== lastSavedDataRef.current) {
      // Set a timeout to save after 1 second of no changes
      saveTimeoutRef.current = setTimeout(() => {
        saveScan(data);
        lastSavedDataRef.current = dataHash;
      }, 1000); // Wait 1 second after last change
    }
  }, [isCompleteScan, getDataHash, saveScan]);

  // Watch for changes in parsedData and trigger debounced save
  useEffect(() => {
    if (Object.keys(parsedData).length > 0) {
      debouncedSave(parsedData);
    }
  }, [parsedData, debouncedSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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

  // Fetch history when switching to history tab or sort changes
  useEffect(() => {
    if (nav === 'history') {
      fetchHistory(historySort);
    }
  }, [nav, historySort]);

  // Delete a scan
  const deleteScan = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/history/${id}`);
      fetchHistory(historySort);
    } catch (err) {
      alert('Failed to delete record.');
    }
  };

  // Delete all scans
  const deleteAllScans = async () => {
    const password = window.prompt('Enter password to delete all history:');
    if (password !== PASSWORD) {
      alert('Incorrect password.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete ALL history? This cannot be undone.')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/history`);
      fetchHistory(historySort);
    } catch (err) {
      alert('Failed to delete all records.');
    }
  };

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
            <div className="history-controls">
              <label>Sort by date: </label>
              <select value={historySort} onChange={e => setHistorySort(e.target.value as 'asc' | 'desc')}>
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
              <button className="history-action-btn" style={{marginLeft: '2rem'}} onClick={deleteAllScans}>Delete All</button>
            </div>
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Full Name</th>
                    <th>Document Number</th>
                    <th>Birth Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, idx) => (
                    <tr key={row.id || idx}>
                      <td>{row.scanned_at ? new Date(row.scanned_at).toLocaleString() : ''}</td>
                      <td>{getRowFullName(row)}</td>
                      <td>{row.data && row.data['Document Number'] ? row.data['Document Number'] : ''}</td>
                      <td>{row.data && row.data['Date of Birth'] ? row.data['Date of Birth'] : ''}</td>
                      <td>
                        <button className="history-action-btn" onClick={() => { setModalData(row); setModalOpen(true); }}>Open</button>
                        <button className="history-action-btn" onClick={() => deleteScan(row.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {modalOpen && modalData && (
              <div className="history-modal-overlay" onClick={() => setModalOpen(false)}>
                <div className="history-modal" onClick={e => e.stopPropagation()}>
                  <button className="history-modal-close" onClick={() => setModalOpen(false)}>&times;</button>
                  <div className="history-modal-title">{modalData.data['Full Name'] || 'Details'}</div>
                  <div className="history-modal-details">
                    {Object.entries(modalData.data).map(([key, value]) => (
                      <div className="detail-row" key={key}>
                        <span className="detail-label">{key}:</span>
                        <span className="detail-value">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
