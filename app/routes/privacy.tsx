import { Link } from "@remix-run/react";

/**
 * Privacy notice used for Fantasy Football OAuth and account access flows.
 */
export default function PrivacyPolicyRoute() {
  return (
    <div className="flex justify-center w-full px-3 py-8">
      <div className="w-full max-w-2xl rounded-xl bg-gray-100 dark:bg-zinc-900 p-6">
        <h1 className="text-3xl font-bold">Fantasy Football Portal Privacy Policy</h1>
        <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
          Effective date: April 25, 2026
        </p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          <p>
            This portal is for our private fantasy football league. We collect
            basic account information (like your email and profile name) so you can
            sign in, vote in Town Hall, and submit league rule ideas.
          </p>
          <p>
            We use this information only to run league features. We do not sell,
            rent, or trade your email address or personal data.
          </p>
          <p>
            We may store your league actions, including votes and rule submissions,
            so commissioners can manage league governance.
          </p>
          <p>
            If you need your data corrected or removed, contact the league
            commissioner.
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
