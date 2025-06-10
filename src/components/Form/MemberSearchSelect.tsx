import React, { useState, useRef, useEffect } from 'react';

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface MemberSearchSelectProps {
  members: Member[];
  value: Member | null;
  onChange: (member: Member) => void;
  placeholder?: string;
  inputClassName?: string;
}

const MemberSearchSelect: React.FC<MemberSearchSelectProps> = ({ members, value, onChange, placeholder, inputClassName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredMembers = members.filter(member =>
    (member.first_name + ' ' + member.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current && !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredMembers[highlightedIndex]) {
        handleMemberSelect(filteredMembers[highlightedIndex]);
      } else if (filteredMembers.length > 0) {
        handleMemberSelect(filteredMembers[0]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredMembers.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
      setHighlightedIndex(-1);
      setSearchTerm('');
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
    }
  };

  const handleMemberSelect = (member: Member) => {
    onChange(member);
    setSearchTerm(member.first_name + ' ' + member.last_name);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        ref={searchInputRef}
        value={searchTerm || (value ? value.first_name + ' ' + value.last_name : '')}
        onChange={e => {
          setSearchTerm(e.target.value);
          setShowDropdown(true);
        }}
        onKeyDown={handleSearchKeyDown}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder || 'Search members...'}
        className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${inputClassName || ''}`}
      />
      {showDropdown && filteredMembers.length > 0 && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            zIndex: 50,
            left: searchInputRef.current ? searchInputRef.current.getBoundingClientRect().left : undefined,
            top: searchInputRef.current ? searchInputRef.current.getBoundingClientRect().bottom + window.scrollY : undefined,
            width: searchInputRef.current ? searchInputRef.current.offsetWidth : undefined
          }}
          className="mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredMembers.map((member, index) => (
            <div
              key={member.id}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                index === highlightedIndex ? 'bg-gray-100' : ''
              }`}
              onClick={() => handleMemberSelect(member)}
            >
              <div className="font-medium">{member.first_name} {member.last_name}</div>
              <div className="text-sm text-gray-500">{member.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemberSearchSelect; 