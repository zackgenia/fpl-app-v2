import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

export function LearnMore() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/">
              <Logo size="md" />
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                to="/about"
                className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                About
              </Link>
              <Link
                to="/squad"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded text-sm transition-colors"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6">
            How FPL Analytics Works
          </h1>

          <div className="prose prose-invert prose-slate max-w-none space-y-8">
            <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-4">Expected Points (xPts)</h2>
              <p className="text-slate-400 leading-relaxed">
                Our xPts model combines multiple data sources to predict how many points a player
                will score over a given number of gameweeks. We factor in:
              </p>
              <ul className="mt-4 space-y-2 text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span>Fixture difficulty ratings (FDR) for upcoming matches</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span>Historical performance and current form</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span>Expected goals (xG) and expected assists (xA)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span>Clean sheet probabilities based on team defensive strength</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span>Minutes played and rotation risk</span>
                </li>
              </ul>
            </section>

            <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-4">Transfer Recommendations</h2>
              <p className="text-slate-400 leading-relaxed">
                Our transfer engine analyzes your current squad and suggests the best moves based
                on your chosen strategy:
              </p>
              <ul className="mt-4 space-y-2 text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span><strong className="text-slate-200">Max Points:</strong> Prioritize the highest predicted returns</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span><strong className="text-slate-200">Best Value:</strong> Focus on points per million spent</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span><strong className="text-slate-200">Low Risk:</strong> Reliable picks with consistent minutes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span><strong className="text-slate-200">Differential:</strong> Low ownership picks for rank climbing</span>
                </li>
              </ul>
            </section>

            <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-4">Data Sources</h2>
              <p className="text-slate-400 leading-relaxed">
                We aggregate data from multiple trusted sources to provide the most accurate insights:
              </p>
              <ul className="mt-4 space-y-2 text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span>Official Fantasy Premier League API</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span>Football-Data.org for league standings and results</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span>Advanced metrics providers for xG and xA data</span>
                </li>
              </ul>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/squad"
              className="inline-block px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-lg transition-colors"
            >
              Try It Now
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs text-slate-600">
            Data from FPL & Football-Data.org
          </p>
        </div>
      </footer>
    </div>
  );
}
