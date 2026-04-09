import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSearchSuggestions } from '../../api/queries';

export function SearchBar() {
  const { familyId } = useParams<{ familyId: string }>();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: suggestions } = useSearchSuggestions(query, familyId);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowDropdown(false);
    const path = familyId ? `/families/${familyId}/search` : '/search';
    navigate(`${path}?q=${encodeURIComponent(query)}`);
  };

  const handleSuggestionClick = (value: string) => {
    setQuery(value);
    setShowDropdown(false);
    const path = familyId ? `/families/${familyId}/search` : '/search';
    navigate(`${path}?q=${encodeURIComponent(value)}`);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          placeholder="搜索人物..."
          className="w-48 lg:w-64 border border-gray-300 rounded-lg px-3 py-1.5 pl-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
        />
        <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </form>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(s.value)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              {s.value}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
