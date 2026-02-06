declare module '*.svg?react' {
    import { FC, SVGProps } from 'react';
    const content: FC<SVGProps<SVGSVGElement>>;
    export default content;
}

declare module '*.svg' {
    import { FC, SVGProps } from 'react';
    const ReactComponent: FC<SVGProps<SVGSVGElement>>;
    export default ReactComponent;
}
