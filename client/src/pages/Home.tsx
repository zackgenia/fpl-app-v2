import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

export function Home() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Logo size="md" />
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

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Logo size="lg" showText={false} />
          <h1 className="mt-8 text-4xl md:text-5xl lg:text-6xl font-bold text-slate-100 leading-tight">
            The smartest FPL tool
            <br />
            <span className="text-emerald-400">on the internet</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Using advanced modelling and prediction algorithms, FPL Analytics helps you make
            data-driven decisions for your Fantasy Premier League team. Maximize your points
            with AI-powered transfer recommendations, fixture analysis, and real-time insights.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/squad"
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-lg transition-colors shadow-lg shadow-emerald-500/20"
            >
              Get Started
            </Link>
            <Link
              to="/learn-more"
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-lg transition-colors border border-slate-700"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-slate-800/50 border-t border-slate-700">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 text-center mb-4">
            Powerful Features
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Everything you need to dominate your FPL mini-league
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: xPts Predictions */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-emerald-500/30 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">xPts Predictions</h3>
              <p className="text-sm text-slate-400">
                AI-powered expected points calculations for every player based on fixtures, form, and advanced metrics.
              </p>
            </div>

            {/* Feature 2: Transfer Recommendations */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-emerald-500/30 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Smart Transfers</h3>
              <p className="text-sm text-slate-400">
                Get personalized transfer recommendations based on your squad, budget, and multiple strategies.
              </p>
            </div>

            {/* Feature 3: Fixture Analysis */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-emerald-500/30 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Fixture Tracker</h3>
              <p className="text-sm text-slate-400">
                Visualize upcoming fixtures with difficulty ratings and clean sheet probabilities for every team.
              </p>
            </div>

            {/* Feature 4: Live Updates */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-emerald-500/30 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Live Updates</h3>
              <p className="text-sm text-slate-400">
                Real-time match data with live points, bonus predictions, and instant notifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold text-emerald-400 tabular-nums">500+</p>
              <p className="text-sm text-slate-400 mt-1">Players Tracked</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-emerald-400 tabular-nums">20</p>
              <p className="text-sm text-slate-400 mt-1">Teams Analyzed</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-emerald-400 tabular-nums">38</p>
              <p className="text-sm text-slate-400 mt-1">Gameweeks</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-emerald-400 tabular-nums">Live</p>
              <p className="text-sm text-slate-400 mt-1">Data Updates</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-4">
            Ready to improve your FPL rank?
          </h2>
          <p className="text-slate-400 mb-8">
            Join thousands of managers using data to make smarter decisions.
          </p>
          <Link
            to="/squad"
            className="inline-block px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-lg transition-colors shadow-lg shadow-emerald-500/20"
          >
            Start Building Your Squad
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo size="sm" />
            <nav className="flex items-center gap-6 text-sm">
              <Link to="/about" className="text-slate-500 hover:text-slate-300 transition-colors">
                About
              </Link>
              <Link to="/learn-more" className="text-slate-500 hover:text-slate-300 transition-colors">
                Learn More
              </Link>
              <a
                href="https://fantasy.premierleague.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                Official FPL
              </a>
            </nav>
            <p className="text-xs text-slate-600">
              Data from FPL & Football-Data.org
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
