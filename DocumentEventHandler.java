package com.infoniqa.one.ddp.onboarding.domain;

import com.infoniqa.one.base.service.security.Security;
import com.infoniqa.one.base.service.validation.ValidationService;
import com.infoniqa.one.ddp.onboarding.domain.properties.DocumentProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.content.commons.annotations.HandleAfterSetContent;
import org.springframework.content.commons.annotations.HandleBeforeSetContent;
import org.springframework.content.commons.annotations.StoreEventHandler;
import org.springframework.data.rest.core.annotation.HandleBeforeCreate;
import org.springframework.data.rest.core.annotation.HandleBeforeDelete;
import org.springframework.data.rest.core.annotation.HandleBeforeSave;
import org.springframework.data.rest.core.annotation.RepositoryEventHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Transactional
@Service
@RepositoryEventHandler
@StoreEventHandler
@RequiredArgsConstructor
@Slf4j
class DocumentEventHandler {

	private final DocumentProperties documentProperties;
	private final DocumentStore documentStore;
	private final ValidationService validationService;
	private final DocumentService documentService;
	private final Employees employees;
	private final AIService aiService;

	@HandleBeforeCreate
	public void beforeCreate(Document document) {
		log.debug("Document before create {}", document.getId());
		Security.checkRoles();
		validationService.validate(document);
		document.getEmployee()
				.addDocument(document);
	}

	@HandleBeforeSave
	public void beforeSave(Document document) {
		log.debug("Document before save {}", document.getId());
		Security.checkRoles();
		beforeDocumentChanged(document);
	}

	@HandleBeforeSetContent
	public void beforeSetContent(Document document) {
		log.debug("Document before set content {}", document.getId());
		beforeDocumentChanged(document);
	}

	private void beforeDocumentChanged(Document document) {
		validationService.validate(document);
		document.checkContentTypeAllowed(documentProperties.getAllowedMimeTypes());
	}

	@HandleAfterSetContent
	public void afterSetContent(Document document) {
		documentService.save(document);
	}

	@HandleBeforeDelete
	public void beforeDelete(Document document) {
		log.debug("Document before delete {}", document.getId());
		Security.checkRoles();
		document.getEmployee()
				.removeDocument(document);
		if (document.hasContent()) {
			documentStore.unsetContent(document);
		}
	}
}
