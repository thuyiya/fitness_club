/**
 * Mocking client-server processing
 */
import _meds from './data_set_one.json';

const TIMEOUT = 100;

const meals = (cb, timeout) => setTimeout(() => cb(_meds), timeout || TIMEOUT);

export default {
  meals,
};
