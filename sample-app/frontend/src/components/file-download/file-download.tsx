import { useState } from 'react'
import styled from 'styled-components'
import { SButton } from '../../styles/styled-components'

export default function FileDownload() {
  const [downloadStatus, setDownloadStatus] = useState<Record<number, string>>(
    {}
  )

  return (
    <Container>
      <Title>File Downloads</Title>

      <FilesList data-testid="files-list">
        {availableFiles.map((file) => (
          <FileItem key={file.id} data-testid={`file-type-${file.type}`}>
            <FileInfo>
              <FileName>{file.name}</FileName>
              <FileMetadata>
                <FileNameCode>{file.filename}</FileNameCode>
                <FileSize>{file.size}</FileSize>
              </FileMetadata>
              {getStatusIndicator(downloadStatus[file.id])}
            </FileInfo>
            <DownloadButton
              onClick={() => handleDownload(file.id, file, setDownloadStatus)}
              disabled={downloadStatus[file.id] === 'processing'}
              data-testid={`download-button-${file.id}`}
            >
              {downloadStatus[file.id] === 'processing'
                ? 'Preparing...'
                : 'Download'}
            </DownloadButton>
          </FileItem>
        ))}
      </FilesList>
    </Container>
  )
}

type FileItem = {
  id: number
  name: string
  filename: string
  type: string
  size: string
  path: string
}

// List of available files to download
const availableFiles: FileItem[] = [
  {
    id: 1,
    name: 'PDF Document',
    filename: '2024636.pdf',
    type: 'application/pdf',
    size: '234 KB',
    path: '/components/file-download/files/2024636.pdf'
  },
  {
    id: 2,
    name: 'ZIP Archive',
    filename: 'cases_export.zip',
    type: 'application/zip',
    size: '598 KB',
    path: '/components/file-download/files/cases_export.zip'
  },
  {
    id: 3,
    name: 'CSV Export',
    filename: 'export_alerts.csv',
    type: 'text/csv',
    size: '25 KB',
    path: '/components/file-download/files/export_alerts.csv'
  },
  {
    id: 4,
    name: 'Excel Spreadsheet',
    filename: 'seon_transactions_export_1750243320497.xlsx',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: '1.4 MB',
    path: '/components/file-download/files/seon_transactions_export_1750243320497.xlsx'
  }
]

/**
 * Handle file download with artificial delay to simulate real-world scenarios
 * @param fileId - ID of the file to download
 * @param file - File item to download
 * @param setDownloadStatus - Status update function
 */
const handleDownload = async (
  fileId: number,
  file: FileItem,
  setDownloadStatus: React.Dispatch<
    React.SetStateAction<Record<number, string>>
  >
) => {
  setDownloadStatus((prev) => ({ ...prev, [fileId]: 'processing' }))

  const getRandomTime = () => Math.floor(Math.random() * 3000) + 1500

  try {
    // delay to simulate processing time
    await new Promise((resolve) => setTimeout(resolve, getRandomTime()))

    // works if the files folder is deployed alongside the component
    const fileUrl = `./files/${file.filename}`

    // create an anchor element and trigger the download
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = file.filename
    link.setAttribute('data-testid', `download-complete-${fileId}`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setDownloadStatus((prev) => ({ ...prev, [fileId]: 'success' }))

    // reset status
    setTimeout(() => {
      setDownloadStatus((prev) => {
        const newStatus = { ...prev }
        delete newStatus[fileId]
        return newStatus
      })
    }, getRandomTime())
  } catch (error) {
    console.error('Download error:', error)
    setDownloadStatus((prev) => ({ ...prev, [fileId]: 'error' }))
  }
}

const getStatusIndicator = (status: string | undefined) => {
  if (!status) return null

  if (status === 'processing') {
    return <Status variant="processing">Processing...</Status>
  } else if (status === 'success') {
    return <Status variant="success">Download complete</Status>
  } else {
    return <Status variant="error">Error - try again</Status>
  }
}

/**
 * FileDownload component that lists files available for download
 * and provides functionality to download them with a simulated delay
 */
// Styled components specific to this file
const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`

const Title = styled.h2`
  color: #283747;
  margin-bottom: 10px;
`

const FilesList = styled.div`
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  gap: 15px;
`

const FileItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-radius: 6px;
  background-color: #f8f9fa;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;

  &:hover {
    background-color: #f1f3f5;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
  }
`

const FileInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const FileName = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: #283747;
`

const FileMetadata = styled.div`
  display: flex;
  gap: 15px;
  color: #6c757d;
  font-size: 0.9rem;
`

const FileNameCode = styled.span`
  font-family: monospace;
`

const FileSize = styled.span`
  color: #495057;
`

const DownloadButton = styled(SButton)`
  padding: 8px 16px;
  background-color: #283747;
  color: white;
  min-width: 100px;

  &:hover {
    background-color: #1e2a37;
  }

  &:disabled {
    background-color: #adb5bd;
  }
`

const Status = styled.span<{
  variant: 'processing' | 'success' | 'error'
}>`
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 0.8rem;
  margin-top: 5px;
  display: inline-block;
  font-weight: 500;

  ${({ variant }) =>
    variant === 'processing' &&
    `
    background-color: #fff3cd;
    color: #856404;
  `}

  ${({ variant }) =>
    variant === 'success' &&
    `
    background-color: #d4edda;
    color: #155724;
  `}

  ${({ variant }) =>
    variant === 'error' &&
    `
    background-color: #f8d7da;
    color: #721c24;
  `}
`
