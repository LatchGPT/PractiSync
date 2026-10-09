import type {Metadata} from 'next';
import './globals.css';
import './dashboard.css';
import './rtu-theme.css';
import './attendance-visuals.css';
import './assessment-workspace.css';
export const metadata:Metadata={title:'PractiSync — RTU-inspired practicum demo',description:'A fictional cooperative education workspace with a blue-and-gold design inspired by Rizal Technological University.',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
