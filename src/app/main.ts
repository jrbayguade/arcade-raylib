import { mount } from 'svelte';
import { useLessonLanguage } from '../../content/pong';
import { setLanguage } from '../i18n/i18n';
import { chooseLanguage, LANGUAGE_KEY } from '../i18n/language';
import App from './App.svelte';
import './app.css';

const stored = (() => { try { return localStorage.getItem(LANGUAGE_KEY); } catch { return null; } })();
const lang = chooseLanguage(stored, navigator.languages ?? [navigator.language]);
setLanguage(lang);
useLessonLanguage(lang);
document.documentElement.lang = lang;

mount(App, { target: document.getElementById('app')! });
