import type { AncestorLayer, DualTreeResponse, PersonNode, DescendantNode, CollateralFamily, SpouseFamily } from '../../types';
import { RelativeGroupSection } from './RelativeGroupSection';

interface MobileTreeViewProps {
  dualTree: DualTreeResponse;
  onPersonClick: (person: PersonNode) => void;
  onSetReference?: (personId: string) => void;
}

function uniquePeople(people: PersonNode[]): PersonNode[] {
  const seen = new Set<string>();
  return people.filter((person) => {
    if (seen.has(person.id)) return false;
    seen.add(person.id);
    return true;
  });
}

function flattenDescendants(nodes: DescendantNode[]): PersonNode[] {
  return nodes.flatMap((node) => [
    node.person,
    ...node.spouses,
    ...flattenDescendants(node.children),
  ]);
}

function flattenCollateral(families: CollateralFamily[]): PersonNode[] {
  return families.flatMap((family) => [
    family.person,
    ...family.spouses,
    ...flattenDescendants(family.children),
  ]);
}

function flattenAncestorLayers(layers: AncestorLayer[]): PersonNode[] {
  return layers.flatMap((layer) => [
    layer.ancestor,
    ...layer.spouses,
    ...flattenCollateral(layer.siblings),
    ...layer.spouseParents,
    ...flattenCollateral(layer.spouseSiblings),
  ]);
}

function flattenSpouseFamilies(families: SpouseFamily[]): PersonNode[] {
  return families.flatMap((family) => [
    family.person,
    ...flattenAncestorLayers(family.ancestors),
    ...flattenCollateral(family.siblings),
  ]);
}

export function MobileTreeView({ dualTree, onPersonClick, onSetReference }: MobileTreeViewProps) {
  const groups = [
    {
      key: 'paternal',
      title: '父系亲属',
      relatives: flattenAncestorLayers(dualTree.paternal),
    },
    {
      key: 'maternal',
      title: '母系亲属',
      relatives: flattenAncestorLayers(dualTree.maternal),
    },
    {
      key: 'affinity',
      title: '配偶与姻亲',
      relatives: flattenSpouseFamilies(dualTree.spouses),
    },
    {
      key: 'children',
      title: '子女后代',
      relatives: flattenDescendants(dualTree.children),
    },
    {
      key: 'siblings',
      title: '兄弟姐妹',
      relatives: flattenCollateral(dualTree.siblings),
    },
  ];

  return (
    <div className="space-y-3 pb-20">
      <RelativeGroupSection
        title="焦点人物"
        relatives={[dualTree.reference]}
        onPersonClick={onPersonClick}
        onSetReference={onSetReference}
      />

      {groups.map((group) => (
        <RelativeGroupSection
          key={group.key}
          title={group.title}
          relatives={uniquePeople(group.relatives)}
          onPersonClick={onPersonClick}
          onSetReference={onSetReference}
        />
      ))}
    </div>
  );
}

export default MobileTreeView;
