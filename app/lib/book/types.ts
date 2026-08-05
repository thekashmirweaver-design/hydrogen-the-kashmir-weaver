export type BookSectionKind =
  | 'preface'
  | 'chapter'
  | 'soul'
  | 'part'
  | 'appendix'
  | 'acknowledgements';

export interface BookSection {
  slug: string;
  kind: BookSectionKind;
  number: number | null;
  title: string;
  subtitle: string;
  order: number;
}

export interface BookMeta {
  title: string;
  subtitle: string;
  edition: string;
}

export interface BookPart {
  label: string;
  title: string;
  sectionSlugs: string[];
}
