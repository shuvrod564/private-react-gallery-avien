import { createContext, useContext, useState, useEffect } from 'react';

const PosterContext = createContext();

export function PosterProvider({ children }) {
  const [showPoster, setShowPoster] = useState(true);

  const togglePoster = () => setShowPoster((prev) => !prev);

  // Synchronize global document.body class whenever showPoster state changes
  useEffect(() => {
    if (showPoster) {
      document.body.classList.add('poster-mode');
    } else {
      document.body.classList.remove('poster-mode');
    }
  }, [showPoster]);

  return (
    <PosterContext.Provider value={{ showPoster, togglePoster }}>
      {children}
    </PosterContext.Provider>
  );
}

export const usePoster = () => useContext(PosterContext);