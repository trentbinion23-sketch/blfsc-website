export type Event = {
  id: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string;
  tag: string;
  excerpt: string;
  description: string;
  image: string;
  featured: boolean;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  excerpt: string;
  description: string;
  image: string;
  featured: boolean;
};

export type NavItem = {
  label: string;
  href: string;
};
