import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Check, X } from 'lucide-react';

interface InlineEditableProps {
  value: string;
  onChange: (newValue: string) => void;
  as?: 'input' | 'textarea';
  className?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  placeholder?: string;
  disabled?: boolean;
  dir?: 'rtl' | 'ltr' | 'auto';
  multiline?: boolean;
  rows?: number;
}

export const InlineEditable: React.FC<InlineEditableProps> = ({
  value,
  onChange,
  as = 'input',
  className = '',
  style = {},
  inputStyle = {},
  placeholder = 'انقر للتعديل...',
  disabled = false,
  dir = 'auto',
  multiline = false,
  rows = 3
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleCommit = () => {
    setIsEditing(false);
    if (tempValue.trim() !== value.trim()) {
      onChange(tempValue);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (!multiline || e.ctrlKey)) {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (disabled) {
    return <span className={className} style={style}>{value || placeholder}</span>;
  }

  if (isEditing) {
    const commonInputStyles: React.CSSProperties = {
      background: 'rgba(15, 23, 42, 0.85)',
      color: '#f8fafc',
      border: '1.5px solid #0284c7',
      borderRadius: '4px',
      padding: '0.2rem 0.45rem',
      fontSize: 'inherit',
      fontFamily: 'inherit',
      fontWeight: 'inherit',
      width: '100%',
      outline: 'none',
      boxShadow: '0 0 0 2px rgba(2, 132, 199, 0.25)',
      boxSizing: 'border-box',
      ...inputStyle
    };

    return (
      <span
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', width: '100%', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        {as === 'textarea' || multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            rows={rows}
            dir={dir}
            style={{ ...commonInputStyles, resize: 'vertical' }}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            dir={dir}
            style={commonInputStyles}
          />
        )}
        <span style={{ display: 'flex', gap: '0.15rem', position: 'absolute', left: dir === 'ltr' ? 'auto' : '4px', right: dir === 'ltr' ? '4px' : 'auto', top: '50%', transform: 'translateY(-50%)' }}>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleCommit(); }}
            style={{ background: '#10b981', border: 'none', color: '#fff', borderRadius: '3px', padding: '0.15rem', cursor: 'pointer', display: 'flex' }}
            title="حفظ"
          >
            <Check size={11} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleCancel(); }}
            style={{ background: '#f43f5e', border: 'none', color: '#fff', borderRadius: '3px', padding: '0.15rem', cursor: 'pointer', display: 'flex' }}
            title="إلغاء"
          >
            <X size={11} />
          </button>
        </span>
      </span>
    );
  }

  if (disabled) {
    return (
      <span
        className={`inline-editable-disabled ${className}`}
        style={{
          borderRadius: '3px',
          padding: '0.05rem 0.2rem',
          display: 'inline-block',
          cursor: 'default',
          ...style
        }}
        title="هذا القسم محمي للقراءة فقط ومقيد رقابياً"
      >
        {value || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>{placeholder}</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-editable-trigger ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title="انقر لتعديل هذا الحقل مباشرة"
      style={{
        cursor: 'text',
        borderRadius: '3px',
        borderBottom: '1px dashed rgba(56, 189, 248, 0.4)',
        padding: '0.05rem 0.2rem',
        display: 'inline-block',
        transition: 'all 0.15s ease',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.08)';
        e.currentTarget.style.borderBottomColor = '#38bdf8';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.borderBottomColor = 'rgba(56, 189, 248, 0.4)';
      }}
    >
      {value || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>{placeholder}</span>}
    </span>
  );
};

