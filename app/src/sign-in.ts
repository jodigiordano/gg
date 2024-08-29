import { sanitizeHtml } from "./helpers.js";

const loginContainer = document.getElementById(
  "login-container",
) as HTMLDivElement;

//
// Google authentication
//

let googleAuthorizationUrl: string | null = null;

const googleButton = document.getElementById(
  "identity-provider-google",
) as HTMLButtonElement;

googleButton.disabled = true;

googleButton.addEventListener("click", function () {
  if (googleAuthorizationUrl) {
    window.location.href = googleAuthorizationUrl;
  }
});

fetch("/api/sign-in/google/authorizationUrl")
  .then(async response => {
    if (response && response.ok) {
      googleAuthorizationUrl = (await response.json()).url;
      googleButton.disabled = false;
    } else {
      disableIdentityProvider(googleButton);
    }
  })
  .catch(() => {
    disableIdentityProvider(googleButton);
  });

//
// Github authentication
//

let githubAuthorizationUrl: string | null = null;

const githubButton = document.getElementById(
  "identity-provider-github",
) as HTMLButtonElement;

githubButton.disabled = true;

githubButton.addEventListener("click", function () {
  if (githubAuthorizationUrl) {
    window.location.href = githubAuthorizationUrl;
  }
});

fetch("/api/sign-in/github/authorizationUrl")
  .then(async response => {
    if (response && response.ok) {
      githubAuthorizationUrl = (await response.json()).url;
      githubButton.disabled = false;
    } else {
      disableIdentityProvider(googleButton);
    }
  })
  .catch(() => {
    disableIdentityProvider(googleButton);
  });

//
// Passwordless authentication
//

const passwordlessStep1 = document.getElementById(
  "passwordless-step-1",
) as HTMLElement;

const passwordlessStep2 = document.getElementById(
  "passwordless-step-2",
) as HTMLElement;

const passwordlessEmail = document.getElementById(
  "passwordless-email",
) as HTMLElement;

const passwordlessForm = document.getElementById(
  "passwordless-form",
) as HTMLFormElement;

passwordlessForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const data = new FormData(passwordlessForm);

  // Must be set after initalizing the FormData.
  //
  // From https://developer.mozilla.org/en-US/docs/Web/API/FormData/FormData
  //
  //   Note: Only successful form controls are included in a FormData object,
  //   i.e. those with a name and not in a disabled state.
  //
  const fieldset = passwordlessForm.querySelector("fieldset")!;

  fieldset.disabled = true;

  fetch("/api/sign-in/passwordless/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(Object.fromEntries(data)),
  })
    .then(response => {
      if (response && response.ok) {
        passwordlessEmail.innerHTML = sanitizeHtml(
          data.get("email")!.toString(),
        );

        passwordlessStep1.classList.add("hidden");
        passwordlessStep2.classList.remove("hidden");
      } else {
        authenticationFailed();
      }
    })
    .catch(() => {
      authenticationFailed();
    });
});

if (window.location.hash.includes("passwordless-token=")) {
  loginContainer.innerHTML = "Validating...";

  const params = Object.fromEntries(
    window.location.hash
      .substring(1)
      .split("&")
      .map(entry => entry.split("=")),
  );

  fetch(
    `/api/sign-in/passwordless/verify?token=${params["passwordless-token"]}`,
  )
    .then(async response => {
      if (response && response.redirected) {
        window.location.replace(response.url);
      } else {
        authenticationFailed();
      }
    })
    .catch(() => {
      authenticationFailed();
    });
}

//
// Authentication failure.
//

const failure = document.getElementById("state-failure") as HTMLElement;

if (window.location.search.includes("state=failure")) {
  failure.classList.remove("hidden");
}

function authenticationFailed(): void {
  window.location.replace("/sign-in.html?state=failure");
}

function disableIdentityProvider(button: HTMLButtonElement): void {
  button.disabled = true;

  button.title = [
    "We have trouble initializing this provider.",
    "Try reloading the page.",
    "If the problem persist, contact support@gg-charts.com",
  ].join("\n");
}
