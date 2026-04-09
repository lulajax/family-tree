import type { DualTreeResponse, PersonNode, DescendantNode, CollateralFamily } from '../../types';

interface MobileTreeViewProps {
  dualTree: DualTreeResponse;
  onPersonClick: (person: PersonNode) => void;
}

const GENDER_COLORS = {
  male: 'bg-blue-500',
  female: 'bg-pink-500',
  unknown: 'bg-gray-400',
} as const;

const GENDER_BORDER = {
  male: 'border-blue-200',
  female: 'border-pink-200',
  unknown: 'border-gray-200',
} as const;

function PersonCard({ person, onClick }: { person: PersonNode; onClick: () => void }) {
  const isRef = person.title === '本人';
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
        isRef ? 'bg-amber-50 border-amber-300' : `bg-white ${GENDER_BORDER[person.gender] ?? 'border-gray-200'}`
      } hover:shadow-sm active:bg-gray-50`}
    >
      {person.photo_url ? (
        <img src={person.photo_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className={`w-9 h-9 rounded-full ${GENDER_COLORS[person.gender] ?? 'bg-gray-400'} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
          {person.name.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-gray-800 text-sm truncate">{person.name}</span>
          {person.title && (
            <span className="text-xs text-amber-600 flex-shrink-0">{person.title}</span>
          )}
        </div>
        {person.birth_date && (
          <span className="text-xs text-gray-400">{person.birth_date.substring(0, 4)}</span>
        )}
      </div>
      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

function CollateralSection({ families, onPersonClick }: { families: CollateralFamily[]; onPersonClick: (p: PersonNode) => void }) {
  return (
    <>
      {families.map(cf => (
        <div key={cf.person.id} className="space-y-1">
          <PersonCard person={cf.person} onClick={() => onPersonClick(cf.person)} />
          {cf.spouses.map(sp => (
            <div key={sp.id} className="ml-4">
              <PersonCard person={sp} onClick={() => onPersonClick(sp)} />
            </div>
          ))}
          {cf.children.map(child => (
            <div key={child.person.id} className="ml-4">
              <DescendantSection desc={child} onPersonClick={onPersonClick} />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function DescendantSection({ desc, onPersonClick }: { desc: DescendantNode; onPersonClick: (p: PersonNode) => void }) {
  return (
    <div className="space-y-1">
      <PersonCard person={desc.person} onClick={() => onPersonClick(desc.person)} />
      {desc.spouses.map(sp => (
        <div key={sp.id} className="ml-4">
          <PersonCard person={sp} onClick={() => onPersonClick(sp)} />
        </div>
      ))}
      {desc.children.map(child => (
        <div key={child.person.id} className="ml-4">
          <DescendantSection desc={child} onPersonClick={onPersonClick} />
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 pt-4 pb-1">{children}</h3>
  );
}

export function MobileTreeView({ dualTree, onPersonClick }: MobileTreeViewProps) {
  const { reference, paternal, maternal, siblings, children, spouses } = dualTree;

  return (
    <div className="space-y-1 pb-20">
      {/* Reference person */}
      <SectionHeader>焦点人物</SectionHeader>
      <PersonCard person={reference} onClick={() => onPersonClick(reference)} />

      {/* Spouses */}
      {spouses.length > 0 && (
        <>
          <SectionHeader>配偶</SectionHeader>
          {spouses.map(sf => (
            <PersonCard key={sf.person.id} person={sf.person} onClick={() => onPersonClick(sf.person)} />
          ))}
        </>
      )}

      {/* Children */}
      {children.length > 0 && (
        <>
          <SectionHeader>子女</SectionHeader>
          {children.map(child => (
            <DescendantSection key={child.person.id} desc={child} onPersonClick={onPersonClick} />
          ))}
        </>
      )}

      {/* Siblings */}
      {siblings.length > 0 && (
        <>
          <SectionHeader>兄弟姐妹</SectionHeader>
          <CollateralSection families={siblings} onPersonClick={onPersonClick} />
        </>
      )}

      {/* Paternal ancestors */}
      {paternal.length > 0 && (
        <>
          <SectionHeader>父系祖先</SectionHeader>
          {paternal.map((layer, i) => (
            <div key={layer.ancestor.id} style={{ marginLeft: i * 8 }}>
              <PersonCard person={layer.ancestor} onClick={() => onPersonClick(layer.ancestor)} />
              {layer.spouses.map(sp => (
                <div key={sp.id} className="ml-4 mt-1">
                  <PersonCard person={sp} onClick={() => onPersonClick(sp)} />
                </div>
              ))}
              {layer.siblings.length > 0 && (
                <div className="ml-4 mt-1">
                  <CollateralSection families={layer.siblings} onPersonClick={onPersonClick} />
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Maternal ancestors */}
      {maternal.length > 0 && (
        <>
          <SectionHeader>母系祖先</SectionHeader>
          {maternal.map((layer, i) => (
            <div key={layer.ancestor.id} style={{ marginLeft: i * 8 }}>
              <PersonCard person={layer.ancestor} onClick={() => onPersonClick(layer.ancestor)} />
              {layer.spouses.map(sp => (
                <div key={sp.id} className="ml-4 mt-1">
                  <PersonCard person={sp} onClick={() => onPersonClick(sp)} />
                </div>
              ))}
              {layer.siblings.length > 0 && (
                <div className="ml-4 mt-1">
                  <CollateralSection families={layer.siblings} onPersonClick={onPersonClick} />
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
