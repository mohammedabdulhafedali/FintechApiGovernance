param (
    [string]$DocxPath,
    [string]$PdfPath
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $DocxPath)) {
    Write-Error "File not found: $DocxPath"
    exit 1
}

$resolvedDocx = (Resolve-Path $DocxPath).Path
$resolvedPdf = [System.IO.Path]::ChangeExtension($resolvedDocx, ".pdf")
if ($PdfPath) {
    $resolvedPdf = $PdfPath
}

$word = $null
$doc = $null

try {
    # Start Word silently in background
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = [Microsoft.Office.Interop.Word.WdAlertLevel]::wdAlertsNone

    # Open the Word document
    $doc = $word.Documents.Open($resolvedDocx, $false, $true) # ReadOnly

    # Save as PDF (17 = wdExportFormatPDF)
    # 17 corresponds to wdFormatPDF
    $doc.SaveAs([ref]$resolvedPdf, [ref]17)

    Write-Output "SUCCESS: Converted to $resolvedPdf"
}
catch {
    Write-Error "Conversion error: $_"
    exit 1
}
finally {
    if ($doc) {
        $doc.Close([ref]0) # wdDoNotSaveChanges
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
    }
    if ($word) {
        $word.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
