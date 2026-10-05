import type {Metadata} from 'next';
import './globals.css';
import './dashboard.css';
import './rtu-theme.css';
import './attendance-visuals.css';
import './class-progress.css';
export const metadata:Metadata={title:'PractiSync — RTU-inspired practicum demo',description:'A fictional cooperative education workspace with a blue-and-gold design inspired by Rizal Technological University.',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
