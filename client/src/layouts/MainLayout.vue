<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title> SteamScraper </q-toolbar-title>
          <q-chip
            v-if="authenticated"
            style="background-color: transparent"
            dark
          >

            <q-avatar dense color="black">
              {{ user.username[0].toUpperCase() }}
            </q-avatar>
            {{ user.username }}
            <q-btn label="logout" @click="signOut" />

          </q-chip>
          <q-btn-group  v-else>
            <q-btn label="login" @click="openLoginDialog" />
            <q-btn label="register" @click="openRegisterDialog" />
          </q-btn-group>
      </q-toolbar>
      <q-toolbar inset>
        <q-breadcrumbs>
          <q-breadcrumbs-el v-for="page in breadcrumbs" :key="page.name" :label="page.name" :icon="page.icon" separator/>
        </q-breadcrumbs>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> Navigation menu </q-item-label>

        <DrawerOption v-for="link in links" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view @error="handleComponentError"/>
      <CredentialsDialog
        v-if="credentialsDialogOpened"
        v-model="credentialsDialogOpened"
        :dialogMode="dialogMode"
        @confirm="sendCredentials"
        @update:model-value="credentialsDialogOpened = false"
      />
      <MessagePopup
        v-if='messagePopupOpened'
        :modelValue="messagePopupOpened"
        :title="messagePopupTitle"
        :message="messagePopupContent"
        @confirm="messagePopupOpened = false"
      />
      <MessagePopup
        v-if="errorDialogOpened"
        error
        :modelValue="errorDialogOpened"
        title="Error"
        :message="errorDialogMessage"
        @confirm="errorDialogOpened = false; $router.push('/')"/>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuthStore } from 'src/stores/auth';
import DrawerOption from 'components/items/DrawerOption.vue';
import CredentialsDialog from 'components/dialogs/CredentialsDialog.vue';
import MessagePopup from 'components/dialogs/MessagePopup.vue';
import { UserCredentials } from 'src/composables/types';
import { storeToRefs } from 'pinia';
import { IBreadcrumbs } from 'src/components/models';
import { useDrawerOptions } from 'src/composables/useDrawerOptions'
import { RouteLocation, onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { auth as api } from 'src/boot/axios';

onBeforeRouteLeave((to) => {
  addBreadcrumbs(to)
})

const { authenticate, signup, signout } = useAuthStore();
const { user, authenticated, loading } = storeToRefs(useAuthStore());

const { publicOptions, restrictedOptions } = useDrawerOptions()

const route = useRoute();
const router = useRouter();


const props = withDefaults(defineProps<{ auth?: boolean }>(), {
  auth: false,
});

const credentialsDialogOpened = ref(props.auth);
const messagePopupOpened = ref(false);
const dialogMode = ref<'login' | 'register'>('login');
const avatarText = ref('');
const errorDialogOpened = ref(false);
const errorDialogMessage = ref('')
const messagePopupTitle = ref('')
const messagePopupContent = ref('')
const breadcrumbs = ref<IBreadcrumbs[]>([{name: 'Home', icon: 'home'}])


const sendCredentials = async (credentials: UserCredentials) => {
  return dialogMode.value === 'login' ? signIn(credentials) : signUp(credentials)
}

const signIn = async (credentials: UserCredentials) => {
  if (!loading.value) {
    const routePath = router.resolve(route.fullPath).href
    let absoluteURL = new URL(routePath, window.location.origin).href
    if (absoluteURL.endsWith('/auth')) absoluteURL = absoluteURL.replace('/auth', '')
    else if (absoluteURL.endsWith('/')) absoluteURL = absoluteURL.replace('/', '')

    try {
      await authenticate(credentials, absoluteURL.concat('/oauth/redirect'));
      avatarText.value = user.value.username[0];
      router.push('/oauth/redirect')
    }
    catch (e: any) {
      loading.value = false
      errorDialogMessage.value = e.response.data.message
      errorDialogOpened.value = true
    }
  }
};

const signUp = async (credentials: UserCredentials) => {
  if (!loading.value) {
    try {
      await signup(credentials)
      messagePopupTitle.value = 'Registration successful'
      messagePopupContent.value = 'You can now login with your credentials.'
      messagePopupOpened.value = true
    }
    catch (e: any) {
      loading.value = false
      errorDialogMessage.value = e.response.data.message
      errorDialogOpened.value = true
    }
  }
}

const signOut = async () => {
  if (!loading.value){
    try {
      await signout()
      router.push('/')
    }
    catch (e: any) {
      loading.value = false
      errorDialogMessage.value = e.response.data.message
      errorDialogOpened.value = true
    }
  }
}

/* add breadcrumbs data (name and icon) to the breadcrumbs array,
if the route is a page listed in drawerOptions, delete all breadcrumbs and add the one relative to the page
else add the page to the breadcrumbs array
also, if the route is already in the breadcrumbs array, remove all the elements after it
*/
function addBreadcrumbs(to: RouteLocation) {
  if (to.name) {
    const page = links.value.find((link) => link.endpoint === to.path);
    if (page) {
      breadcrumbs.value = [{name: page.title, icon: page.icon}]
    } else {
      const index = breadcrumbs.value.findIndex((el) => el.name === to.name);
      if (index !== -1) {
        breadcrumbs.value = breadcrumbs.value.slice(0, index + 1);
      } else {
        breadcrumbs.value.push({name: to.name as string, icon: to.meta.icon as string})
      }
    }
  }
}

const openLoginDialog = () => {
  dialogMode.value = 'login';
  credentialsDialogOpened.value = true
}

const openRegisterDialog = () => {
  dialogMode.value = 'register';
  credentialsDialogOpened.value = true
}

const leftDrawerOpen = ref(false);

const links = computed(() =>
  authenticated.value
    ? publicOptions.concat(...restrictedOptions)
    : publicOptions
);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

const handleComponentError = (error: string) => {
  errorDialogMessage.value = error
  errorDialogOpened.value = true
}
</script>
