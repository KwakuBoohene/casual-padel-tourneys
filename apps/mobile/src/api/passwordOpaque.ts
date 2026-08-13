import * as opaque from "@serenity-kit/opaque";

let readyPromise: Promise<void> | null = null;

export async function ensureOpaqueClientReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = opaque.ready;
  }
  await readyPromise;
}

export async function opaqueStartRegistration(password: string) {
  await ensureOpaqueClientReady();
  return opaque.client.startRegistration({ password });
}

export async function opaqueFinishRegistration(input: {
  clientRegistrationState: string;
  registrationResponse: string;
  password: string;
}) {
  await ensureOpaqueClientReady();
  return opaque.client.finishRegistration(input);
}

export async function opaqueStartLogin(password: string) {
  await ensureOpaqueClientReady();
  return opaque.client.startLogin({ password });
}

export async function opaqueFinishLogin(input: {
  clientLoginState: string;
  loginResponse: string;
  password: string;
}) {
  await ensureOpaqueClientReady();
  return opaque.client.finishLogin(input);
}
