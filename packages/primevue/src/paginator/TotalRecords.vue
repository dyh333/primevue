<template>
    <span :class="cx('pcTotalRecords')" v-bind="ptm('pcTotalRecords')">{{ $primevue.config.locale.total }} {{ totalRecords }} {{ $primevue.config.locale.items }}</span>
</template>

<script>
import BaseComponent from '@primevue/core/basecomponent';

export default {
    name: 'TotalRecords',
    hostName: 'Paginator',
    extends: BaseComponent,
    props: {
        totalRecords: {
            type: Number,
            default: 0
        }
    },
    methods: {
    }
};
</script>
