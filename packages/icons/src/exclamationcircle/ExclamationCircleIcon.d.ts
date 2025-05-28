import type { DefineComponent } from '@primevue/core';
import type { Icon } from '@primevue/icons/baseicon';

declare class ExclamationCircleIcon extends Icon {}

declare module 'vue' {
    export interface GlobalComponents {
        ExclamationCircleIcon: DefineComponent<ExclamationCircleIcon>;
    }
}

export default ExclamationCircleIcon;
