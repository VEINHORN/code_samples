import React, { FunctionComponent, useEffect, useRef, useState } from "react";

import {
  FileUpload,
  FileUploadHeaderTemplateOptions,
} from "primereact/fileupload";
import "primereact/resources/primereact.min.css";
import "primereact/resources/themes/md-light-indigo/theme.css";

import "primeicons/primeicons.css";
import documentStyle from "@src/components/documents/document.module.css";

import DocumentWarning from "@src/components/documents/DocumentWarning";
import { DocumentModel } from "@src/components/documents/document-model";
import { ACCEPTED_FILE_TYPES } from "@src/config/constants";
import {
  showNotificationError,
  showNotificationSuccess,
} from "@src/layouts/Notification";
import { logger } from "@src/utils/logger";
import { AxiosInstance, HttpStatusCode } from "axios";
import _ from "lodash";
import { DocumentType } from "@src/config/constants";

import { FlatNamespace, KeyPrefix, TFunction } from "i18next";
import { FallbackNs } from "react-i18next";
import { $Tuple } from "react-i18next/helpers";

interface DocumentUploadProps<
  Ns extends FlatNamespace | $Tuple<FlatNamespace> | undefined = undefined,
  KPrefix extends KeyPrefix<FallbackNs<Ns>> = undefined,
> {
  disabled?: boolean;
  afterUpload?: () => void;
  entityId?: string;
  updateEntityEvent?: () => void;
  currentDocuments: DocumentModel[];
  triggeredUploadExternally?: boolean | undefined;
  path: string;
  emptyTemplate?: React.ReactNode;
  additionalButtons?: React.ReactNode;
  documentType: DocumentType;
  footer?: string;
  t: TFunction<FallbackNs<Ns>, KPrefix>;
  extendedApiInstance: AxiosInstance;
}

const DocumentUpload: FunctionComponent<DocumentUploadProps> = ({
  triggeredUploadExternally,
  disabled = false,
  afterUpload = () => {},
  entityId,
  updateEntityEvent: updateEntityEvent = () => {},
  t,
  currentDocuments,
  path = "documents",
  emptyTemplate,
  additionalButtons,
  documentType = DocumentType.ATTACHMENT,
  footer = `document:document.${documentType}.footer`,
  extendedApiInstance,
}) => {
  const fileRef = useRef<FileUpload>(null);
  const [filesInProcess, setFilesInProcess] = useState<File[]>([]);
  const [viewWarning, setViewWarning] = useState<boolean>(false);
  const [doubletFiles, setDoubletFiles] = useState<File[]>([]);

  useEffect(() => {
    const uploadEndingConditionals =
      _.isEmpty(filesInProcess) && !_.isUndefined(entityId);
    const documentSavingConditionals =
      !_.isEmpty(filesInProcess) && !_.isUndefined(entityId) && !viewWarning;

    if (
      documentSavingConditionals &&
      (_.isUndefined(triggeredUploadExternally)
        ? true
        : triggeredUploadExternally)
    ) {
      handleSaveDocuments();
    } else if (
      uploadEndingConditionals &&
      (_.isUndefined(triggeredUploadExternally)
        ? false
        : triggeredUploadExternally)
    ) {
      endUpload();
    } else if (_.isEmpty(filesInProcess) && !viewWarning) {
      fileRef.current?.clear();
    } else if (!_.isEmpty(filesInProcess) && _.isUndefined(entityId)) {
      updateEntityEvent();
    }
  }, [viewWarning, filesInProcess, entityId, triggeredUploadExternally]);
  const endUpload = () => {
    afterUpload();
    setViewWarning(false);
    setDoubletFiles([]);
    setFilesInProcess([]);
  };

  const checkForDuplicatesDocumentList = async () => {
    const currentDocumentsTitles = _.map(
      currentDocuments,
      (documents) => documents.name,
    );
    return filesInProcess.filter(
      (file) => currentDocumentsTitles.indexOf(file.name) !== -1,
    );
  };

  const saveDocuments = async (duplicates: File[]) => {
    for (const file of filesInProcess) {
      let formData = new FormData();
      formData.append("file", file);
      await extendedApiInstance
        .post(path.replace("{entityId}", entityId ?? ""), formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          params: {
            overwrite: !_.isEmpty(doubletFiles),
          },
        })
        .then((response) => {
          showNotificationSuccess(
            `${t(
              response.status == HttpStatusCode.Ok
                ? "document:document.upload.overwrite.success"
                : "document:document.upload.success",
              {
                document: file.name,
              },
            )} `,
          );
        })
        .catch((e) => {
          if (e.response.status === HttpStatusCode.NotAcceptable) {
            duplicates.push(file);
          } else {
            logger.error("error document upload", e.message);
            showNotificationError(
              `${t("document:document.upload.error", {
                document: file.name,
              })} `,
            );
          }
        });
    }
    if (!_.isEmpty(duplicates)) {
      setDoubletFiles(duplicates);
      setFilesInProcess([]);
      setViewWarning(true);
    } else {
      endUpload();
    }
  };
  const handleSaveDocuments = async () => {
    let duplicates: File[] = _.isEmpty(doubletFiles)
      ? await checkForDuplicatesDocumentList()
      : [];
    if (!_.isEmpty(duplicates)) {
      setDoubletFiles(duplicates);
      setViewWarning(true);
    } else if (_.isEmpty(duplicates)) {
      await saveDocuments(duplicates);
    }
  };
  const headerTemplate = (options: FileUploadHeaderTemplateOptions) => {
    const { className, chooseButton, uploadButton, cancelButton } = options;

    return (
      <div
        className={className}
        style={{
          backgroundColor: "transparent",
          display: "flex",
          alignItems: "center",
        }}
      >
        {chooseButton}
        {uploadButton}
        {cancelButton}
        {currentDocuments.length > 0 && additionalButtons}
      </div>
    );
  };
  return (
    <>
      <FileUpload
        ref={fileRef}
        name="fileUpload"
        multiple
        uploadHandler={(event) => setFilesInProcess(event.files)}
        onSelect={(event) => event.originalEvent.stopPropagation()}
        accept={ACCEPTED_FILE_TYPES}
        maxFileSize={20971520}
        auto={true}
        customUpload
        onRemove={(e) => {
          const files: File[] = filesInProcess;
          let filesRef: File[] = [];
          for (const file of files) {
            if (file.name != e.file.name) {
              filesRef.push(file);
            }
          }
          setFilesInProcess(filesRef);
        }}
        headerTemplate={headerTemplate}
        chooseOptions={{
          style: { borderRadius: "2rem", padding: "1rem" },
          label: `${t("document:document.upload.label")} `,
        }}
        disabled={disabled}
        emptyTemplate={
          emptyTemplate ?? <p className="m-0">{`${t(footer)} `}</p>
        }
      />
      <p className={documentStyle.documentUpload_footer}>{`${t(footer)} `}</p>
      <DocumentWarning
        documents={doubletFiles}
        documentType={documentType}
        viewWarning={viewWarning}
        onDecline={() => {
          if (!_.isEmpty(filesInProcess)) {
            const newFilesInProcess = _.xor(filesInProcess, doubletFiles);
            if (!_.isEmpty(newFilesInProcess)) {
              setFilesInProcess(newFilesInProcess);
              setViewWarning(false);
            } else {
              endUpload();
            }
          }
        }}
        onClose={() => {
          endUpload();
        }}
        onAccept={() => {
          if (_.isEmpty(filesInProcess)) {
            setFilesInProcess(doubletFiles);
          }
          setViewWarning(false);
        }}
        t={t}
      />
    </>
  );
};

export default DocumentUpload;
