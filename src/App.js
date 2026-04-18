// import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
// import HomeScreen from './screens/HomeScreen';
// import CharacterSelectScreen from './screens/CharacterSelectScreen';
// import CharacterConfirmScreen from './screens/CharacterConfirmScreen';
// import MainLobbyScreen from './screens/MainLobbyScreen';
// import CharacterDetailScreen from './screens/CharacterDetailScreen';
// import VisualNovelScreen from './screens/VisualNovelScreen';
// import LessonScreen from './screens/LessonScreen';

// import './App.css';

// function App() {
//   return (
//     <BrowserRouter>
// <<<<<<< HEAD
//   <div
//     className="app-layout"
//     style={{
//       width: "100%",
//       height: "100vh",
//       position: "relative",
//     }}
//   >
//     <header
//       className="app-topbar"
//       style={{
//         position: "fixed",
//         top: 0,
//         left: 0,
//         right: 0,
//         zIndex: 1000,
//       }}
//     >
//       <div className="brand-group">
        
// =======
//       <div className="app-layout">
//         <header className="app-topbar">
//           <div className="brand-group">
//             <div className="brand-mark">UI</div>
//             <div>
//               <div className="brand-title">Game UI Lab</div>
//               <div className="brand-caption">언제든 홈으로 돌아갈 수 있습니다</div>
//             </div>
//           </div>
//           <nav className="app-topnav">
//             <Link to="/" className="nav-chip">
//               HOME
//             </Link>
//           </nav>
//         </header>

//         <main className="app-main">
//           <Routes>
//             <Route path="/" element={<HomeScreen />} />
//             <Route path="/select" element={<CharacterSelectScreen />} />
//             <Route path="/confirm" element={<CharacterConfirmScreen />} />
//             <Route path="/lobby" element={<MainLobbyScreen />} />
//             <Route path="/detail" element={<CharacterDetailScreen />} />
//             <Route path="/lesson/basic-multiplication" element={<LessonScreen />} />
//             <Route path="/visual-novel/:scriptId" element={<VisualNovelScreen />} />
//             <Route path="*" element={<HomeScreen />} />
//           </Routes>
//         </main>
// >>>>>>> 1e390f7 (Add note lesson)
//       </div>

//       <nav className="app-topnav">
//         <Link to="/" className="nav-chip">
//           HOME
//         </Link>
//       </nav>
//     </header>

//     <main
//       className="app-main"
//       style={{
//         width: "100%",
//         height: "100%",
//       }}
//     >
//       <Routes>
//         <Route path="/" element={<HomeScreen />} />
//         <Route path="/select" element={<CharacterSelectScreen />} />
//         <Route path="/confirm" element={<CharacterConfirmScreen />} />
//         <Route path="/lobby" element={<MainLobbyScreen />} />
//         <Route path="/detail" element={<CharacterDetailScreen />} />
//         <Route path="/visual-novel/:scriptId" element={<VisualNovelScreen />} />
//         <Route path="*" element={<HomeScreen />} />
//       </Routes>
//     </main>
//   </div>
// </BrowserRouter>
//   );
// }

// export default App;
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import CharacterSelectScreen from './screens/CharacterSelectScreen';
import CharacterConfirmScreen from './screens/CharacterConfirmScreen';
import MainLobbyScreen from './screens/MainLobbyScreen';
import CharacterDetailScreen from './screens/CharacterDetailScreen';
import VisualNovelScreen from './screens/VisualNovelScreen';
import LessonScreen from './screens/LessonScreen';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div
        className="app-layout"
        style={{
          width: '100%',
          height: '100vh',
          position: 'relative',
        }}
      >
        <header
          className="app-topbar"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
          }}
        >
          <div className="brand-group">
            <div className="brand-mark">UI</div>
            <div>
              <div className="brand-title">Game UI Lab</div>
              <div className="brand-caption">언제든 홈으로 돌아갈 수 있습니다</div>
            </div>
          </div>

          <nav className="app-topnav">
            <Link to="/" className="nav-chip">
              HOME
            </Link>
          </nav>
        </header>

        <main
          className="app-main"
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/select" element={<CharacterSelectScreen />} />
            <Route path="/confirm" element={<CharacterConfirmScreen />} />
            <Route path="/lobby" element={<MainLobbyScreen />} />
            <Route path="/detail" element={<CharacterDetailScreen />} />
            <Route path="/lesson/basic-multiplication" element={<LessonScreen />} />
            <Route path="/visual-novel/:scriptId" element={<VisualNovelScreen />} />
            <Route path="*" element={<HomeScreen />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;