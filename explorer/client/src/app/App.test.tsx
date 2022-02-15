import { render, screen } from '@testing-library/react';

import App from './App';

describe('App component', () => {
    it('renders the app', () => {
        render(<App />);
        const linkElement = screen.getByText(/Mysten Labs/i);
        expect(linkElement).toBeInTheDocument();
    });
});
