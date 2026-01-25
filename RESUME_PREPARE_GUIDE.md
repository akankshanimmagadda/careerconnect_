# Resume Prepare Feature

## Overview
The Resume Prepare feature is an Overleaf-like LaTeX editor integrated into the job portal, allowing job seekers to create professional resumes using LaTeX.

## Features
- **Split-screen interface**: LaTeX editor on the left, PDF preview on the right
- **Real-time editing**: Write LaTeX code with syntax highlighting
- **Live compilation**: Compile your resume to PDF with one click
- **Download functionality**: Download your compiled resume as a PDF file
- **Auto-save**: Your work is automatically saved to your browser's local storage
- **Fullscreen mode**: Focus on your resume without distractions
- **Compilation logs**: View detailed logs if compilation fails

## How to Use

### 1. Accessing the Feature
- Log in as a **Job Seeker**
- Click on **"RESUME"** in the navigation bar
- You'll be taken to the Resume Prepare page

### 2. Editing Your Resume
- The left panel contains a LaTeX editor with a default resume template
- Modify the template or write your own LaTeX code
- Your changes are automatically saved to local storage

### 3. Compiling Your Resume
- Click the **"Compile"** button in the top toolbar
- The system will compile your LaTeX code to PDF
- If successful, the PDF preview will appear on the right
- If there are errors, check the "Logs" tab for details

### 4. Downloading Your Resume
- After successful compilation, click the **"Download PDF"** button
- Your resume will be saved as `resume.pdf`

### 5. Fullscreen Mode
- Click the fullscreen icon to maximize the editor
- Perfect for focused work on your resume

## LaTeX Basics

### Document Structure
```latex
\documentclass[a4paper,11pt]{article}
\begin{document}
% Your content here
\end{document}
```

### Common Commands
- `\textbf{Bold Text}` - Bold text
- `\textit{Italic Text}` - Italic text
- `\section*{Section Name}` - Create a section
- `\begin{itemize}...\end{itemize}` - Bullet points
- `\\` - Line break
- `\hfill` - Horizontal fill (push text to the right)

### Resume Sections
The default template includes:
- Personal Information (Name, Contact)
- Summary
- Education
- Experience
- Skills
- Projects
- Certifications

## Tips for Best Results

1. **Keep it simple**: Stick to standard LaTeX packages for best compatibility
2. **Test frequently**: Compile often to catch errors early
3. **Use comments**: Add `% comments` to document your LaTeX code
4. **Check logs**: If compilation fails, check the Logs tab for error details
5. **Save backups**: Although auto-save is enabled, consider keeping backups of important versions

## Technical Details

### Backend Compilation
The system uses two methods for LaTeX compilation:
1. **Online Service**: Uses LaTeX.Online API (primary method)
2. **Local Compilation**: Falls back to local pdflatex if available

### Supported Packages
The default template uses:
- `inputenc` - UTF-8 encoding
- `geometry` - Page margins
- `enumitem` - List formatting
- `hyperref` - Clickable links

You can add more packages as needed, but ensure they're available in standard LaTeX distributions.

## Troubleshooting

### Compilation Fails
- Check your LaTeX syntax
- Ensure all `\begin{}` have matching `\end{}`
- Review the Logs tab for specific error messages
- Try the default template to verify the system is working

### PDF Not Displaying
- Ensure compilation was successful
- Try compiling again
- Check your browser's PDF viewer settings
- Try downloading the PDF directly

### Auto-save Not Working
- Check browser's local storage permissions
- Clear browser cache and try again
- Consider manually backing up your LaTeX code

## Resources

### Learning LaTeX
- [Overleaf LaTeX Documentation](https://www.overleaf.com/learn)
- [LaTeX Wikibook](https://en.wikibooks.org/wiki/LaTeX)
- [ShareLaTeX Tutorials](https://www.sharelatex.com/learn)

### Resume Templates
- Search for "LaTeX resume templates" online
- Overleaf has many free resume templates
- Adapt existing templates to your needs

## Support
For issues or questions, please contact the platform administrators or refer to the main project documentation.
