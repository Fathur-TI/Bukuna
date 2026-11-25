import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

/**
 * Komponen reusable TextInput di level atas (/src/components/TextInput.jsx)
 * agar tidak pernah di-remount ulang saat komponen halaman re-render.
 *
 * Mendukung:
 * - label, type, name, id, value, onChange, placeholder, error
 * - autoComplete, inputMode
 * - opsi tampilkan/sembunyikan password (showPasswordToggle)
 * - ikon kiri (icon) & elemen kanan kustom (rightElement)
 */
export default function TextInput({
  label,
  type = 'text',
  name,
  id,
  value,
  onChange,
  placeholder = '',
  error = '',
  autoComplete,
  inputMode,
  icon: LeftIcon = null,
  showPasswordToggle = false,
  rightElement = null,
  inputRef = null,
  className = '',
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const inputId = id || `bukuna-field-${name || 'input'}`;
  const isPasswordField = type === 'password';
  const resolvedType = isPasswordField && isPasswordVisible ? 'text' : type;

  const resolvedInputMode =
    inputMode ||
    (type === 'email' ? 'email' : type === 'search' ? 'search' : 'text');

  return (
    <div className={`w-full text-left ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="sub-form-label block text-[#FFE9B0] mb-1.5 pl-1"
        >
          {label}
        </label>
      )}

      <div className="relative w-full flex items-center">
        {LeftIcon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#062D2C]/65 flex items-center justify-center">
            <LeftIcon className="w-5 h-5" />
          </span>
        )}

        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type={resolvedType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={resolvedInputMode}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full min-h-[50px] ${
            LeftIcon ? 'pl-12' : 'pl-5'
          } ${
            (isPasswordField && showPasswordToggle) || rightElement ? 'pr-12' : 'pr-5'
          } py-3 rounded-full bg-white text-[#062D2C] placeholder:text-slate-400 font-bold text-sm sm:text-base border-2 ${
            error ? 'border-red-400' : 'border-transparent focus:border-[#E07030]'
          } focus:outline-none shadow-inner transition-colors`}
        />

        {isPasswordField && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((prev) => !prev)}
            aria-label={isPasswordVisible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            {isPasswordVisible ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}

        {!isPasswordField && rightElement && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="sub-help mt-1.5 pl-2 text-[#FFE9B0] flex items-center gap-1.5"
        >
          <AlertCircle className="w-3.5 h-3.5 text-red-300 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

