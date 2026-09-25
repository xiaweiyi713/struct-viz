import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
      <div className="text-center">
        <div className="text-7xl font-black bg-gradient-to-br from-indigo-500 to-violet-500 bg-clip-text text-transparent mb-4">
          404
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          页面不存在
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          你访问的地址可能输错了，或者页面已经被移动。
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            返回首页
          </button>
          <button
            onClick={() => navigate("/sandbox")}
            className="px-5 py-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
          >
            去沙盒实验
          </button>
        </div>
      </div>
    </div>
  );
}
