export interface MenuItem {
    label?: string;
    icon?: string;
    to?: string;
    url?: string;
    target?: string;
    class?: string;
    path?: string;
    disabled?: boolean;
    separator?: boolean;
    visible?: boolean;
    items?: MenuItem[];
    command?: (event: { originalEvent: Event; item: MenuItem }) => void;
}
