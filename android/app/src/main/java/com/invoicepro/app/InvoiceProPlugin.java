package com.invoicepro.app;

import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.MimeTypeMap;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.InputStream;

@CapacitorPlugin(
    name = "InvoicePro",
    permissions = {
        @Permission(
            strings = { "android.permission.WRITE_EXTERNAL_STORAGE" },
            alias = "writeStorage"
        ),
        @Permission(
            strings = { "android.permission.READ_EXTERNAL_STORAGE" },
            alias = "readStorage"
        )
    }
)
public class InvoiceProPlugin extends Plugin {

    /**
     * Save a base64-encoded file to the public Downloads folder.
     * Uses MediaStore on Android 10+ for scoped storage compatibility,
     * and direct file write on older versions.
     */
    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String base64Data = call.getString("data");
        String filename = call.getString("filename", "document.pdf");
        String mimeType = call.getString("mimeType", "application/pdf");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("No data provided");
            return;
        }

        try {
            byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Context context = getContext();
            Uri fileUri;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ : Use MediaStore API (no permission needed)
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                values.put(MediaStore.Downloads.IS_PENDING, 1);

                fileUri = context.getContentResolver().insert(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);

                if (fileUri == null) {
                    call.reject("Failed to create MediaStore entry");
                    return;
                }

                OutputStream os = context.getContentResolver().openOutputStream(fileUri);
                if (os != null) {
                    os.write(fileBytes);
                    os.flush();
                    os.close();
                }

                // Mark as completed
                values.clear();
                values.put(MediaStore.Downloads.IS_PENDING, 0);
                context.getContentResolver().update(fileUri, values, null, null);

            } else {
                // Android 9 and below: Direct file write to Downloads
                File downloadsDir = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOWNLOADS);
                File outFile = new File(downloadsDir, filename);

                // If file exists, append number
                int counter = 1;
                String baseName = filename.replace(".pdf", "");
                while (outFile.exists()) {
                    outFile = new File(downloadsDir, baseName + "_" + counter + ".pdf");
                    counter++;
                }

                FileOutputStream fos = new FileOutputStream(outFile);
                fos.write(fileBytes);
                fos.flush();
                fos.close();

                // Notify MediaScanner so it appears in file manager
                fileUri = Uri.fromFile(outFile);
                Intent scanIntent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, fileUri);
                context.sendBroadcast(scanIntent);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("uri", fileUri.toString());
            result.put("path", "Downloads/" + filename);
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Failed to save file: " + e.getMessage());
        }
    }

    /**
     * Share a base64-encoded file using Android's share sheet.
     * This creates a proper ACTION_SEND intent with the file as EXTRA_STREAM,
     * which allows email, WhatsApp, etc. to receive the file as an attachment.
     */
    @PluginMethod
    public void shareFile(PluginCall call) {
        String base64Data = call.getString("data");
        String filename = call.getString("filename", "document.pdf");
        String title = call.getString("title", "Share Document");
        String mimeType = call.getString("mimeType", "application/pdf");
        String dialogTitle = call.getString("dialogTitle", "Share");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("No data provided");
            return;
        }

        try {
            byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Context context = getContext();

            // Write file to cache directory
            File cacheDir = context.getCacheDir();
            File outFile = new File(cacheDir, filename);

            // Clean up any previous file with same name
            if (outFile.exists()) {
                outFile.delete();
            }

            FileOutputStream fos = new FileOutputStream(outFile);
            fos.write(fileBytes);
            fos.flush();
            fos.close();

            // Get content URI via FileProvider
            Uri contentUri = androidx.core.content.FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                outFile
            );

            // Create share intent
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(mimeType);
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            // Also add text if provided
            String text = call.getString("text", "");
            if (!text.isEmpty()) {
                shareIntent.putExtra(Intent.EXTRA_TEXT, text);
            }

            // Show chooser
            Intent chooser = Intent.createChooser(shareIntent, dialogTitle);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getActivity().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Failed to share file: " + e.getMessage());
        }
    }

    /**
     * Share a base64-encoded file specifically via WhatsApp.
     * Opens WhatsApp directly if installed, falls back to share sheet.
     */
    @PluginMethod
    public void shareToWhatsApp(PluginCall call) {
        String base64Data = call.getString("data");
        String filename = call.getString("filename", "document.pdf");
        String message = call.getString("message", "");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("No data provided");
            return;
        }

        try {
            byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Context context = getContext();

            // Write file to cache directory
            File cacheDir = context.getCacheDir();
            File outFile = new File(cacheDir, filename);
            if (outFile.exists()) outFile.delete();

            FileOutputStream fos = new FileOutputStream(outFile);
            fos.write(fileBytes);
            fos.flush();
            fos.close();

            // Get content URI via FileProvider
            Uri contentUri = androidx.core.content.FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                outFile
            );

            // Try WhatsApp first
            Intent whatsappIntent = new Intent(Intent.ACTION_SEND);
            whatsappIntent.setType("application/pdf");
            whatsappIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            whatsappIntent.putExtra(Intent.EXTRA_TEXT, message);
            whatsappIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            whatsappIntent.setPackage("com.whatsapp");

            try {
                whatsappIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(whatsappIntent);

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("launched", "whatsapp");
                call.resolve(result);
                return;
            } catch (Exception e) {
                // WhatsApp not installed, fall through to general share
            }

            // Fallback: share sheet
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("application/pdf");
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.putExtra(Intent.EXTRA_TEXT, message);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            Intent chooser = Intent.createChooser(shareIntent, "Share PDF via...");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("launched", "chooser");
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Failed to share to WhatsApp: " + e.getMessage());
        }
    }

    /**
     * Print a PDF file by opening it with a PDF viewer that supports printing.
     * On Android, this uses ACTION_VIEW with the PDF file, which lets the
     * user choose an app that can view/print PDFs.
     */
    @PluginMethod
    public void printFile(PluginCall call) {
        String base64Data = call.getString("data");
        String filename = call.getString("filename", "document.pdf");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("No data provided");
            return;
        }

        try {
            byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Context context = getContext();

            // Write file to cache directory
            File cacheDir = context.getCacheDir();
            File outFile = new File(cacheDir, "print_" + filename);
            if (outFile.exists()) outFile.delete();

            FileOutputStream fos = new FileOutputStream(outFile);
            fos.write(fileBytes);
            fos.flush();
            fos.close();

            // Get content URI via FileProvider
            Uri contentUri = androidx.core.content.FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                outFile
            );

            // Try ACTION_SEND with print option first (shows share sheet with Print option)
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("application/pdf");
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            Intent chooser = Intent.createChooser(shareIntent, "Print Invoice");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Failed to print file: " + e.getMessage());
        }
    }
}
