import { sanitizeHtml } from "./helpers.js";

const identity = document.getElementById("identity") as HTMLElement;
const plan = document.getElementById("plan") as HTMLElement;
const planDetails = document.getElementById("plan-details") as HTMLElement;
const refreshSubscription = document.getElementById(
  "refresh-subscription",
) as HTMLButtonElement;

const manageSubscription = document.getElementById(
  "manage-subscription",
) as HTMLLinkElement;

const reactivateSubscription = document.getElementById(
  "reactivate-subscription",
) as HTMLButtonElement;

const confirmIdentity = document.getElementById(
  "confirm-identity",
) as HTMLElement;

//
// Load profile.
//

fetch("/api/profile")
  .then(async response => {
    if (response.ok) {
      const profile = await response.json();

      identity.innerHTML = sanitizeHtml(profile.email);
      confirmIdentity.innerHTML = sanitizeHtml(profile.email);
    } else {
      identity.innerHTML = "Anonymous (not authenticated)";
      confirmIdentity.innerHTML = "Anonymous (not authenticated)";
    }
  })
  .catch(() => {
    identity.innerHTML = "Anonymous (not authenticated)";
    confirmIdentity.innerHTML = "Anonymous (not authenticated)";
  });

//
// Load / Refresh subscription.
//

function loadSubscription(): void {
  fetch("/api/subscription")
    .then(async response => {
      if (!response.ok) {
        plan.innerHTML = "Unknown";

        planDetails.innerHTML = [
          "An error occured and your plan cannot be retrieved at the moment.",
          "",
          'Please reload the page or click on "refresh" above.',
        ].join("<br/>");

        return;
      }

      const subscription = await response.json();

      manageSubscription.classList.remove("hidden");
      reactivateSubscription.classList.add("hidden");

      if (subscription.status === "trialing") {
        const trialEndAt = subscription.trialEnd * 1000;
        const today = Date.now();
        const oneDay = 1000 * 60 * 60 * 24;
        const daysLeft = Math.ceil((trialEndAt - today) / oneDay);

        plan.innerHTML = "Trial";

        planDetails.innerHTML = [
          `You have ${daysLeft} days left in your trial.`,
          "After that you will be billed monthly.",
          "",
          'If you did not already do so, click on "Manage subscription" below to add a payment method to your subscription.',
        ].join("<br/>");
      } else if (subscription.status === "active") {
        plan.innerHTML = "Active";

        planDetails.innerHTML = "Thank you for your support! ❤️";
      } else if (
        subscription.status === "paused" ||
        subscription.status === "incomplete" ||
        subscription.status === "incomplete_expired"
      ) {
        plan.innerHTML = "Trial ended";

        planDetails.innerHTML = [
          "Your trial has ended and your account is now in <b>read-only</b>.",
          "",
          'To continue using gg+, click on "Manage subscription" below to add a payment method to your subscription.',
        ].join("<br/>");
      } else if (subscription.status === "past_due") {
        plan.innerHTML = "Past due";

        planDetails.innerHTML = [
          "You have an outstanding bill to pay on your subscription.",
          "",
          'You can still use gg+ features but you should click on "Manage subscription" below to fix the issue and avoid your account becoming <b>read only</b>.',
          "",
          'Send me an e-mail at <a href="mailto:jodi@gg-charts.com">jodi@gg-charts.com</a> if you need assistance.',
        ].join("<br/>");
      } else if (subscription.status === "unpaid") {
        plan.innerHTML = "Unpaid";

        planDetails.innerHTML = [
          "You have an outstanding bill to pay on your subscription and your account is now in <b>read-only</b>.",
          "",
          'To continue using gg+, click on "Manage subscription" below to fix the issue.',
          "",
          'Send me an e-mail at <a href="mailto:jodi@gg-charts.com">jodi@gg-charts.com</a> if you need assistance.',
        ].join("<br/>");
      } /* canceled */ else {
        plan.innerHTML = "Canceled";

        planDetails.innerHTML = [
          "Your plan is canceled and your account is now in <b>read-only</b>.",
          "",
          'To continue using gg+, click on "Subscribe again" below to create a brand new subscription.',
        ].join("<br/>");

        manageSubscription.classList.add("hidden");
        reactivateSubscription.classList.remove("hidden");
      }
    })
    .catch(() => {
      plan.innerHTML = "Unknown";

      planDetails.innerHTML = [
        "An error occured and your plan cannot be retrieved at the moment.",
        "",
        'Please reload the page or click on "refresh" above.',
      ].join("<br/>");
    });
}

document
  .getElementById("refresh-subscription")
  ?.addEventListener("click", function () {
    refreshSubscription.disabled = true;
    loadSubscription();
    refreshSubscription.disabled = false;
  });

loadSubscription();

//
// Reactivate account.
//

reactivateSubscription.addEventListener("click", function () {
  reactivateSubscription.disabled = true;

  fetch("/api/subscription/reactivate", { method: "POST" })
    .then(async response => {
      if (response.ok) {
        loadSubscription();
      } else {
        // TODO: handle error.
      }
    })
    .catch(/* TODO: handle error */)
    .finally(() => {
      reactivateSubscription.disabled = false;
    });
});

//
// Delete account.
//

const deleteAccountDialog = document.getElementById(
  "delete-account",
) as HTMLDialogElement;

deleteAccountDialog.addEventListener("keydown", event => {
  event.stopPropagation();
});

const deleteAccountConfirmInput = deleteAccountDialog.querySelector(
  "input",
) as HTMLInputElement;

document
  .getElementById("operation-delete-account")
  ?.addEventListener("click", function () {
    deleteAccountDialog.showModal();
  });

document
  .getElementById("operation-delete-account-apply-changes")
  ?.addEventListener("click", function () {
    fetch("/api/profile/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: deleteAccountConfirmInput.value }),
    })
      .then(async response => {
        if (response.redirected) {
          window.location.replace(response.url);
        } else {
          // TODO: handle error.
        }
      })
      .catch(/* TODO: handle error */);
  });
