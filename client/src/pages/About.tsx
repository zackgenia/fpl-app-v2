import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

export function About() {
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
                to="/learn-more"
                className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Learn More
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
            About FPL Analytics
          </h1>

          <div className="space-y-8">
            <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-4">Our Mission</h2>
              <p className="text-slate-400 leading-relaxed">
                FPL Analytics was built to help Fantasy Premier League managers make smarter,
                data-driven decisions. We believe that everyone should have access to the same
                quality of analysis that professional analysts use.
              </p>
            </section>

            <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-4">The Technology</h2>
              <p className="text-slate-400 leading-relaxed">
                Our platform uses machine learning models trained on historical FPL data,
                combined with real-time statistics to generate predictions. The xPts model
                considers over 20 different factors when calculating expected points for
                each player.
              </p>
            </section>

            <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-4">Free & Open</h2>
              <p className="text-slate-400 leading-relaxed">
                FPL Analytics is completely free to use. We're passionate about the game
                and want to give back to the FPL community. No sign-up required, no premium
                features locked behind paywalls.
              </p>
            </section>

            <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-4">Disclaimer</h2>
              <p className="text-slate-400 leading-relaxed text-sm">
                FPL Analytics is not affiliated with, endorsed by, or connected to the
                official Fantasy Premier League or the Premier League. All data is sourced
                from publicly available APIs. Predictions are based on statistical models
                and should be used as one of many tools in your decision-making process.
              </p>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/squad"
              className="inline-block px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-lg transition-colors"
            >
              Start Using FPL Analytics
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
