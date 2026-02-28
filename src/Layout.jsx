import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, History, BarChart3, Trophy, User } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const scrollPositions = useRef({});
  const contentRef = useRef(null);
  
  const navItems = [
    { icon: Home, label: 'Home', page: 'Home' },
    { icon: History, label: 'History', page: 'History' },
    { icon: BarChart3, label: 'Stats', page: 'Statistics' },
    { icon: Trophy, label: 'Standings', page: 'Standings' },
    { icon: User, label: 'Profile', page: 'Profile' },
  ];

  const isActive = (page) => {
    const pageUrl = createPageUrl(page);
    return location.pathname === pageUrl || location.pathname === pageUrl + '/';
  };

  // Save scroll position when navigating away
  useEffect(() => {
    return () => {
      if (contentRef.current) {
        scrollPositions.current[location.pathname] = contentRef.current.scrollTop;
      }
    };
  }, [location.pathname]);

  // Restore scroll position when returning to a page
  useEffect(() => {
    if (contentRef.current && scrollPositions.current[location.pathname] !== undefined) {
      contentRef.current.scrollTop = scrollPositions.current[location.pathname];
    } else if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const hideNav = false;

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen bg-slate-900" ref={contentRef}>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
      
      {/* Bottom Navigation */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800/95 backdrop-blur-lg border-t border-lime-500/10" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-lg mx-auto px-2">
            <div className="flex items-center justify-around py-2">
              {navItems.map((item) => {
                const active = isActive(item.page);
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={cn(
                      "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
                      active ? "text-lime-400" : "text-slate-400 hover:text-lime-300"
                    )}
                  >
                    <item.icon className={cn("w-6 h-6 transition-transform", active && "scale-110")} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}