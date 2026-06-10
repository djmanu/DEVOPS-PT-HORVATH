const fs = require('fs');
const path = require('path');

const {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} = require('docx');

const rootDir = path.resolve(__dirname, '..');

function resolveWorkspacePath(targetPath) {
  return path.isAbsolute(targetPath) ? targetPath : path.join(rootDir, targetPath);
}

function getCliPaths() {
  const [sourceArg, outputArg] = process.argv.slice(2);

  if (!sourceArg) {
    const docsDir = path.join(rootDir, 'docs');
    return {
      sourcePath: path.join(docsDir, 'Test-Strategy-Group-6-Reservations.md'),
      outputPath: path.join(docsDir, 'Test-Strategy-Group-6-Reservations.docx'),
    };
  }

  const sourcePath = resolveWorkspacePath(sourceArg);
  const outputPath = outputArg
    ? resolveWorkspacePath(outputArg)
    : sourcePath.replace(/\.md$/i, '.docx');

  return { sourcePath, outputPath };
}

function normalParagraph(text) {
  return new Paragraph({
    children: [new TextRun(text)],
    spacing: { after: 160 },
  });
}

function heading(text, level) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 200, after: 120 },
  });
}

function bullet(text) {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

function codeLine(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: 'Courier New',
      }),
    ],
    spacing: { after: 0 },
  });
}

function parseTable(lines) {
  const rows = lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));

  const [header, , ...body] = rows;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'BFBFBF' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'BFBFBF' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'BFBFBF' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'BFBFBF' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: header.map(
          (cell) =>
            new TableCell({
              shading: { fill: 'D9E2F3', type: ShadingType.CLEAR, color: 'auto' },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell, bold: true })],
                }),
              ],
            })
        ),
      }),
      ...body.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [normalParagraph(cell)],
                })
            ),
          })
      ),
    ],
  });
}

async function main() {
  const { sourcePath, outputPath } = getCliPaths();
  const markdown = fs.readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');
  const lines = markdown.split('\n');
  const children = [];

  let index = 0;
  let paragraphBuffer = [];

  function flushParagraph() {
    if (!paragraphBuffer.length) {
      return;
    }

    children.push(normalParagraph(paragraphBuffer.join(' ')));
    paragraphBuffer = [];
  }

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      flushParagraph();
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        children.push(codeLine(lines[index] || ' '));
        index += 1;
      }
      children.push(normalParagraph(''));
      index += 1;
      continue;
    }

    if (trimmed.startsWith('|')) {
      flushParagraph();
      const tableLines = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        tableLines.push(lines[index]);
        index += 1;
      }
      children.push(parseTable(tableLines));
      children.push(normalParagraph(''));
      continue;
    }

    if (trimmed.startsWith('# ')) {
      flushParagraph();
      children.push(heading(trimmed.slice(2), HeadingLevel.TITLE));
      index += 1;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph();
      children.push(heading(trimmed.slice(3), HeadingLevel.HEADING_1));
      index += 1;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushParagraph();
      children.push(heading(trimmed.slice(4), HeadingLevel.HEADING_2));
      index += 1;
      continue;
    }

    if (trimmed.startsWith('- ')) {
      flushParagraph();
      children.push(bullet(trimmed.slice(2)));
      index += 1;
      continue;
    }

    paragraphBuffer.push(trimmed);
    index += 1;
  }

  flushParagraph();

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(document);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  process.stdout.write(`Generated ${outputPath}\n`);
}

main().catch((error) => {
  console.error('Failed to generate the Word document.');
  console.error(error);
  process.exit(1);
});
