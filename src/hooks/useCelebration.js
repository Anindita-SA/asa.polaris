import { createContext, useContext } from 'react';

export const CelebrationContext = createContext({
  celebrate: () => {}
});

export const useCelebration = () => useContext(CelebrationContext);
