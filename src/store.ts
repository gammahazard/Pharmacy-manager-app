import { createSignal } from "solid-js";

// This will hold the data of the Rx we want to refill
export const [refillQueue, setRefillQueue] = createSignal<any>(null);