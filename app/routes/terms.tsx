import { Link } from "@remix-run/react";

/**
 * Terms of use for the Fantasy Football league portal.
 */
export default function TermsRoute() {
  return (
    <div className="flex justify-center w-full px-3 py-8">
      <div className="w-full max-w-2xl rounded-xl bg-gray-100 dark:bg-zinc-900 p-6">
        <h1 className="text-3xl font-bold">Fantasy Football Portal Terms of Service</h1>
        <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
          Effective date: April 25, 2026
        </p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          <p>
            This site is a private portal for our fantasy football league. By using
            it, you agree to use it only for league-related activity.
          </p>
          <p>
            You are responsible for the accuracy of your rule submissions and votes.
            Submitted content should stay respectful and league-appropriate.
          </p>
          <p>
            League commissioners may manage ballot timing, visibility, and submitted
            content to operate the league.
          </p>
          <p>
            Access can be revoked for misuse, abuse, or attempts to interfere with
            the portal or league operations.
          </p>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-300 dark:border-zinc-700">
          <Link
            className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
            to="/fantasy_football"
          >
            Return to Fantasy Football home
          </Link>
        </div>
      </div>
    </div>
  );
}
