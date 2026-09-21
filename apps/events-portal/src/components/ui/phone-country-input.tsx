import React from 'react';

interface PhoneCountryInputProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (phone: string) => void;
  hasError?: boolean;
  placeholder?: string;
}

const COUNTRIES = [
  { code: '+51', name: 'Perú', flag: '🇵🇪' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+52', name: 'México', flag: '🇲🇽' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+593', name: 'Ecuador', flag: '🇪🇨' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+591', name: 'Bolivia', flag: '🇧🇴' },
  { code: '+1', name: 'EE.UU.', flag: '🇺🇸' },
  { code: '+34', name: 'España', flag: '🇪🇸' },
];

export const PhoneCountryInput: React.FC<PhoneCountryInputProps> = ({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  hasError = false,
  placeholder = '987 654 321',
}) => {
  return (
    <div
      className={`flex items-center rounded-xl border bg-background text-foreground transition-colors overflow-hidden ${
        hasError ? 'border-destructive ring-1 ring-destructive' : 'border-border focus-within:border-medmind-primary focus-within:ring-1 focus-within:ring-medmind-primary'
      }`}
    >
      <select
        value={countryCode}
        onChange={(e) => onCountryCodeChange(e.target.value)}
        className="h-11 bg-transparent px-2.5 text-xs sm:text-sm font-medium border-r border-border focus:outline-none cursor-pointer"
        aria-label="Código de país"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code} className="bg-background text-foreground">
            {c.flag} {c.code}
          </option>
        ))}
      </select>
      <input
        type="tel"
        value={phoneNumber}
        onChange={(e) => onPhoneNumberChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 flex-1 bg-transparent px-3 text-xs sm:text-sm focus:outline-none"
      />
    </div>
  );
};
