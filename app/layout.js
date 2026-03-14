export const metadata = {
  title: "StudyAbroad Notify",
  description: "Internal Notification System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
