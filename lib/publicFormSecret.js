/**
 * Shared secret for public POST /api/public/* and /api/consular-registration.
 * Alias EMBASSY_PUBLIC_FORM_SECRET in case PUBLIC_FORM_SECRET was mis-keyed in the host UI.
 */
function getPublicFormSecret() {
  return String(
    process.env.PUBLIC_FORM_SECRET || process.env.EMBASSY_PUBLIC_FORM_SECRET || ""
  ).trim();
}

function publicFormSecretConfigured() {
  return Boolean(getPublicFormSecret());
}

module.exports = { getPublicFormSecret, publicFormSecretConfigured };
