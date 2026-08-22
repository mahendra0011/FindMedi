const fs = require('fs');

// Fix DashboardLayout.jsx
let dashboardContent = fs.readFileSync('client/src/components/DashboardLayout.jsx', 'utf8');

dashboardContent = dashboardContent.replace(
    "`dashboard-main h-screen overflow-y-auto overscroll-contain transition-all duration-300 flex flex-col ${isMobile ? 'p-4 pb-0 pt-16' : 'p-6 pb-0 md:p-8 md:pb-0'}`",
    "`dashboard-main h-screen overflow-y-auto overscroll-contain transition-all duration-300 flex flex-col ${isAIChat ? 'p-0 pt-16 md:pt-0' : (isMobile ? 'p-4 pb-0 pt-16' : 'p-6 pb-0 md:p-8 md:pb-0')}`"
);

fs.writeFileSync('client/src/components/DashboardLayout.jsx', dashboardContent, 'utf8');

// Fix AIChatPage.jsx
let chatContent = fs.readFileSync('client/src/pages/AIChatPage.jsx', 'utf8');

// Remove negative margins which are no longer needed since we removed padding from DashboardLayout
chatContent = chatContent.replace(
    'className="flex flex-col h-[calc(100vh-4.5rem)] -mx-6 -my-6 sm:h-[calc(100vh-5rem)] bg-card relative overflow-hidden"',
    'className="flex flex-col h-[calc(100vh-4rem)] sm:h-screen bg-card relative overflow-hidden border-0 rounded-none m-0"'
);

// In case the height calculation is different, also replace the header to not have borders
chatContent = chatContent.replace(
    'className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0 z-10 shadow-sm relative"',
    'className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0 z-10 relative"'
);

fs.writeFileSync('client/src/pages/AIChatPage.jsx', chatContent, 'utf8');

console.log("Fixed Layouts completely");
