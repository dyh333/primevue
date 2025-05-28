import type { DefineComponent } from '@primevue/core';
import type { Icon } from '@primevue/icons/baseicon';

declare class CheckCircleIcon extends Icon {}

declare module 'vue' {
    export interface GlobalComponents {
        CheckCircleIcon: DefineComponent<CheckCircleIcon>;
    }
}

export default CheckCircleIcon;
