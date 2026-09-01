import React from 'react';
import '../styles/tokens.css';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="layout">
      <div className="layout-container">
        {title && <h1 className="layout-title">{title}</h1>}
        {subtitle && <p className="layout-subtitle">{subtitle}</p>}
        <div className="layout-content">{children}</div>
      </div>
    </div>
  );
};
