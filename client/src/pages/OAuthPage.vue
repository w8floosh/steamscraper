<template>
    <q-page class="row items-center justify-evenly">
        <h3>Logging in...</h3>
        <q-circular-progress
            indeterminate
            rounded
            size="50px"
            color="lime"
            class="q-ma-md"
        />
        <MessagePopup error
            v-if="errorDialogOpened"
            :modelValue="errorDialogOpened"
            title="Authorization error"
            :message="errorDialogMessage"
            @confirm="closeDialog" />
    </q-page>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore } from 'src/stores/auth';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import MessagePopup from 'src/components/dialogs/MessagePopup.vue';
import { AxiosError } from 'axios';

const { user, clientState, authCode, loading } = storeToRefs(useAuthStore());
const { authorize } = useAuthStore();
const router = useRouter()

const errorDialogOpened = ref(false)
const errorDialogMessage = ref('')

const closeDialog = () => {
    errorDialogOpened.value = false
    router.push('/')
}

onMounted(async() => {
    try {
        const tokens = await authorize(authCode.value, clientState.value, `${window.location.href}`);
        clientState.value = '';
        authCode.value = '';
        user.value.accessToken = tokens.access_token;
        router.push('/')
    }
    catch (e) {
        if (e instanceof AxiosError && e.response)
        errorDialogMessage.value = e.response.data.message
        errorDialogOpened.value = true
        loading.value = false
    }
})
</script>
