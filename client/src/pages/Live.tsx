function Live() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-fpl-green/10 rounded-xl flex items-center justify-center">
          <span className="text-xl">⚡</span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Live Updates</h2>
          <p className="text-sm text-slate-500">Real-time match data and points</p>
        </div>
      </div>
      <div className="text-sm text-slate-600">
        Live data will appear here during matchdays. Keep this tab open for updates.
      </div>
    </div>
  );
}

export default Live;
