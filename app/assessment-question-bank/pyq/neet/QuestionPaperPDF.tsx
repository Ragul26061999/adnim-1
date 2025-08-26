import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import latexToPngDataUrl from './latexToDataUrl';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#fff',
    padding: 24,
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  questionCol: {
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  question: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'Times-Roman',
  },
  option: {
    fontSize: 11,
    marginLeft: 12,
    fontFamily: 'Times-Roman',
  },
  latexImg: {
    width: 180,
    height: 24,
    marginBottom: 2,
    marginLeft: 0,
    objectFit: 'contain',
  }
});

function chunkArray(array: any[], size: number) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// Helper to render preprocessed parts
function RenderParts(parts: (string | { latex: string, img: string })[]) {
  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string'
          ? <Text key={i}>{part}</Text>
          : part.img
            ? <Image key={i} src={part.img} style={{ width: 40, height: 18, marginBottom: -2, marginLeft: 2, marginRight: 2 }} />
            : <Text key={i}>{`$${part.latex}$`}</Text>
      )}
    </>
  );
}

export default function QuestionPaperPDF({ questions, viewYear }: { questions: any[], viewYear: number }) {
  const questionPairs = chunkArray(questions, 2);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {questionPairs.map((pair, rowIdx) => (
          <View style={styles.row} key={rowIdx}>
            {pair.map((q, colIdx) => (
              <View style={styles.questionCol} key={q.id}>
                {/* Render question: LaTeX as image if available, else as preprocessed parts */}
                {q.questionLatexImg ? (
                  <Image src={q.questionLatexImg} style={styles.latexImg} />
                ) : (
                  <Text style={styles.question}>{rowIdx * 2 + colIdx + 1}. {RenderParts(q.questionParts || [])}</Text>
                )}
                {/* Render options: LaTeX as image if available, else as preprocessed parts */}
                {['A', 'B', 'C', 'D'].map(opt => {
                  const imgKey = `option${opt}LatexImg`;
                  const partsKey = `option${opt}Parts`;
                  return q[imgKey] ? (
                    <Image key={opt} src={q[imgKey]} style={styles.latexImg} />
                  ) : (
                    <Text key={opt} style={styles.option}>
                      ({opt}) {RenderParts(q[partsKey] || [])}
                    </Text>
                  );
                })}
              </View>
            ))}
            {pair.length === 1 && <View style={styles.questionCol}></View>}
          </View>
        ))}
      </Page>
    </Document>
  );
} 